(function(){
    function getIcon(id) {
        const tpl = document.getElementById(`icon-${id}`);
        return tpl ? tpl.innerHTML : '';
    }

    const STORAGE_PREFIX = 'wh_v53_';
    const SALARY_PREFIX = 'sc_v45_';
    const DEF_NORMAL = 8, DEF_OVERTIME = 4;
    const FULL_HOURS_KEY = 'fh_v35';
    const THEME_KEY = 'theme_pref';

    let year, month, data = [];
    let selectedDay = null;
    let fullWorkHours = 0;
    let salaryConfig = {
        baseSalary:0, performance:0, otherDeduction:0, otherAllowance:0,
        insuranceDeduction:0, personalTax:0, manualOvertimePay:null,
        rentDeduction:0, mealFeeDeduction:0, highTempAllowance:0, seniorityAllowance:0,
        nightAllowanceManual:null
    };

    const $ = id => document.getElementById(id);
    const cardsWrapper = $('cardsWrapper');
    const toastEl = $('toastMsg');
    const modalOverlay = $('editModalOverlay');
    const themeMeta = $('themeColorMeta');
    const dropdownMenu = $('dropdownMenu');
    const moreBtn = $('moreBtn');

    const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    function showToast(msg) {
        toastEl.textContent = msg; toastEl.classList.add('show');
        clearTimeout(toastEl._timeout);
        toastEl._timeout = setTimeout(() => toastEl.classList.remove('show'), 1800);
    }

    // ========== 彩蛋逻辑（全屏版） ==========
    let easterEggClicks = 0;
    let easterEggTimer = null;
    function triggerEasterEgg() {
        const emojis = ['💰', '✨', '🌟', '💵', '🪙', '💎', '🎉', '🧧'];
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        for (let i = 0; i < 35; i++) {
            const particle = document.createElement('span');
            particle.textContent = emojis[i % emojis.length];
            const angle = Math.random() * 2 * Math.PI;
            const distance = 150 + Math.random() * 350;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance - 120;
            particle.style.cssText = `
                position: fixed;
                left: ${centerX}px;
                top: ${centerY}px;
                font-size: ${24 + Math.random() * 36}px;
                pointer-events: none;
                z-index: 9999;
                transition: all 1.6s cubic-bezier(0.15, 0.8, 0.2, 1);
                opacity: 1;
                transform: translate(-50%, -50%) scale(0.5);
            `;
            document.body.appendChild(particle);
            requestAnimationFrame(() => {
                particle.style.transform = `translate(${dx}px, ${dy}px) scale(1) rotate(${Math.random() * 720}deg)`;
                particle.style.opacity = '0';
            });
            setTimeout(() => particle.remove(), 1800);
        }

        for (let i = 0; i < 10; i++) {
            const big = document.createElement('div');
            big.textContent = ['💎', '🌟', '🎊'][i % 3];
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            big.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y - 100}px;
                font-size: 60px;
                pointer-events: none;
                z-index: 9998;
                opacity: 0;
                transition: all 2s ease-out;
                transform: scale(0) rotate(0deg);
            `;
            document.body.appendChild(big);
            requestAnimationFrame(() => {
                big.style.opacity = '0.9';
                big.style.transform = `scale(1.2) rotate(${Math.random() * 360}deg)`;
                big.style.top = `${y + 200}px`;
            });
            setTimeout(() => {
                big.style.opacity = '0';
                setTimeout(() => big.remove(), 500);
            }, 2000);
        }

        showToast('🎉 全屏撒钱！恭喜发财！ 💰');
    }

    const titleGroup = $('titleGroup');
    if (titleGroup) {
        titleGroup.addEventListener('click', (e) => {
            easterEggClicks++;
            clearTimeout(easterEggTimer);
            if (easterEggClicks >= 5) {
                triggerEasterEgg();
                easterEggClicks = 0;
            }
            easterEggTimer = setTimeout(() => { easterEggClicks = 0; }, 2000);
        });
    }
    // ========== 彩蛋逻辑结束 ==========

    const getDays = (y,m) => new Date(y,m,0).getDate();
    const getFirstDay = (y,m) => new Date(y,m-1,1).getDay();
    const getKey = () => STORAGE_PREFIX + year + '_' + month;
    const getSalaryKey = () => SALARY_PREFIX + year + '_' + month;

    function loadData() {
        const raw = localStorage.getItem(getKey());
        const days = getDays(year, month);
        if(raw){ try{ const p=JSON.parse(raw); data=p.rows||[]; }catch(e){data=[];} }else data=[];
        data.forEach(d => { d.shift = d.shift || ''; d.normal = d.normal || 0; d.overtime = d.overtime || 0; });
        while(data.length < days) data.push({shift:'', normal:0, overtime:0});
        if(data.length > days) data.length = days;
    }
    function saveData(){ localStorage.setItem(getKey(), JSON.stringify({year,month,rows:data})); }
    function clearCurrentMonth(){
        if(confirm('Clear all scheduling and hours data for the current month? This only affects the current month.')){
            data = Array(getDays(year, month)).fill(null).map(() => ({shift:'', normal:0, overtime:0}));
            saveData();
            renderAll();
            showToast('Month cleared');
        }
    }
    function loadSalaryConfig(){
        salaryConfig = {
            baseSalary:0, performance:0, otherDeduction:0, otherAllowance:0,
            insuranceDeduction:0, personalTax:0, manualOvertimePay:null,
            rentDeduction:0, mealFeeDeduction:0, highTempAllowance:0, seniorityAllowance:0,
            nightAllowanceManual:null
        };
        const key = getSalaryKey();
        const raw = localStorage.getItem(key);
        if(raw){
            try{ const s = JSON.parse(raw); salaryConfig = { ...salaryConfig, ...s }; }catch(e){}
        }
    }
    function saveSalaryConfig(){ localStorage.setItem(getSalaryKey(), JSON.stringify(salaryConfig)); }
    function loadFullHours(){
        try{ const v = localStorage.getItem(FULL_HOURS_KEY); if(v !== null) fullWorkHours = parseInt(v); }catch(e){}
        if(isNaN(fullWorkHours) || fullWorkHours < 0) fullWorkHours = 0;
    }
    function saveFullHours(){ localStorage.setItem(FULL_HOURS_KEY, fullWorkHours.toString()); }

    function computeWorkStats(){
        let normalTotal = 0, overtimeTotal = 0, holidayTotal = 0;
        data.forEach(d => {
            const n = d.normal || 0, o = d.overtime || 0;
            normalTotal += n;
            if(d.shift === 'holiday') holidayTotal += o;
            else overtimeTotal += o;
        });
        return { total: normalTotal + overtimeTotal, normalTotal, overtimeTotal, holidayTotal };
    }

    function computeOvertimeSalary(){
        let nonHoliday=0, holidayOvt=0;
        data.forEach(d => {
            if(d.shift === 'holiday') { holidayOvt += (d.overtime||0); return; }
            nonHoliday += (d.normal||0) + (d.overtime||0);
        });
        const overtimeHrs = Math.max(0, nonHoliday - fullWorkHours);
        const rate = salaryConfig.baseSalary / 21.75 / 8;
        const normalPay = rate * 1.5 * overtimeHrs;
        const holidayPay = rate * 3 * holidayOvt;
        const autoPay = normalPay + holidayPay;
        return {
            overtimeHours: overtimeHrs, holidayOvertimeHours: holidayOvt,
            normalOvertimePay: normalPay, holidayOvertimePay: holidayPay,
            autoOvertimePay: autoPay,
            finalOvertimePay: salaryConfig.manualOvertimePay !== null ? salaryConfig.manualOvertimePay : autoPay,
            hourRate: rate
        };
    }

    function computeSalary(){
        const oRes = computeOvertimeSalary();
        const totalAllHours = data.reduce((sum, d) => sum + (d.normal||0) + (d.overtime||0), 0);
        const meal = totalAllHours * 1;
        const nightCount = data.filter(d => d.shift === 'night').length;
        const autoNight = nightCount * 30;
        const nightAllow = salaryConfig.nightAllowanceManual !== null ? salaryConfig.nightAllowanceManual : autoNight;
        const gross = salaryConfig.baseSalary + salaryConfig.performance + salaryConfig.otherAllowance
            + meal + oRes.finalOvertimePay + nightAllow
            + salaryConfig.highTempAllowance + salaryConfig.seniorityAllowance
            - salaryConfig.otherDeduction - salaryConfig.rentDeduction - salaryConfig.mealFeeDeduction;
        const net = gross - salaryConfig.insuranceDeduction - salaryConfig.personalTax;
        return { gross, net, meal, nightAllow, autoNight, overtimeRes: oRes };
    }

    function openModal(idx){
        selectedDay = idx;
        const row = data[idx] || { shift:'', normal:0, overtime:0 };
        document.querySelectorAll('#modalShiftSelector .shift-option-big').forEach(b => b.classList.toggle('active', b.dataset.shift === row.shift));
        $('modalNormal').value = row.normal;
        $('modalOvertime').value = row.overtime;
        modalOverlay.classList.add('show');
        setTimeout(() => $('modalOvertime').focus(), 400);
    }
    function closeModal(){
        modalOverlay.classList.remove('show');
        document.activeElement?.blur?.();
    }
    function saveModal(){
        if(selectedDay === null) return;
        data[selectedDay].normal = Math.min(24, Math.max(0, parseFloat($('modalNormal').value) || 0));
        data[selectedDay].overtime = Math.min(24, Math.max(0, parseFloat($('modalOvertime').value) || 0));
        saveData();
        closeModal();
        renderAll();
        showToast('Hours saved');
    }
    function setShiftFromModal(shift){
        if(selectedDay === null) return;
        const def = (shift==='work'||shift==='night') ? {normal:DEF_NORMAL, overtime:DEF_OVERTIME} : {normal:0, overtime:0};
        data[selectedDay].shift = shift;
        data[selectedDay].normal = def.normal;
        data[selectedDay].overtime = def.overtime;
        document.querySelectorAll('#modalShiftSelector .shift-option-big').forEach(b => b.classList.toggle('active', b.dataset.shift === shift));
        $('modalNormal').value = def.normal;
        $('modalOvertime').value = def.overtime;
        saveData();
        renderAll();
        const shiftNames = {work:'Day', night:'Night', rest:'Rest', holiday:'Holiday'};
        showToast(`Set to ${shiftNames[shift]}`);
    }

    function updateCalendarVisibility() {
        const expandedSections = document.querySelectorAll('.section.open');
        const calendarSection = document.getElementById('calendarArea');
        if (calendarSection) calendarSection.classList.toggle('hidden', expandedSections.length > 0);
    }

    function hasNonDefaultOvertime(row) {
        const ot = row.overtime || 0;
        if (row.shift === 'work' || row.shift === 'night') return ot !== DEF_OVERTIME;
        if (row.shift === 'rest' || row.shift === 'holiday') return ot > 0;
        return false;
    }

    function toggleCard(section) {
        const wrapper = section.querySelector('.card-body-wrapper');
        if (!wrapper) return;
        const isOpen = section.classList.contains('open');
        if (isOpen) {
            wrapper.style.height = wrapper.scrollHeight + 'px';
            requestAnimationFrame(() => { wrapper.style.height = '0px'; });
            section.classList.remove('open');
        } else {
            section.classList.add('open');
            wrapper.style.height = wrapper.scrollHeight + 'px';
            const onTransitionEnd = () => {
                wrapper.style.height = 'auto';
                wrapper.removeEventListener('transitionend', onTransitionEnd);
            };
            wrapper.addEventListener('transitionend', onTransitionEnd);
        }
        updateCalendarVisibility();
    }

    const icons = {
        clock: getIcon('clock'), plus: getIcon('plus'), star: getIcon('star'), check: getIcon('check'),
        coin: getIcon('coin'), starCoin: getIcon('starCoin'), pencil: getIcon('pencil'), reset: getIcon('reset'),
        baseSalary: getIcon('baseSalary'), performance: getIcon('performance'), otherDeduction: getIcon('otherDeduction'),
        otherAllowance: getIcon('otherAllowance'), insurance: getIcon('insurance'), personalTax: getIcon('personalTax'),
        meal: getIcon('meal'), nightAllow: getIcon('nightAllow'), rent: getIcon('rent'), mealFee: getIcon('mealFee'),
        highTemp: getIcon('highTemp'), seniority: getIcon('seniority')
    };

    function renderAll(){
        const daysInMonth = getDays(year, month);
        if (selectedDay === null || selectedDay < 0 || selectedDay >= daysInMonth) {
            const today = new Date();
            selectedDay = (today.getFullYear() === year && today.getMonth()+1 === month) ? today.getDate()-1 : 0;
        }
        const stats = computeWorkStats();
        const pct = fullWorkHours > 0 ? Math.min(100, (stats.total / fullWorkHours)*100) : 0;
        const circ = 2 * Math.PI * 18;
        const off = circ - (pct/100)*circ;

        const sal = computeSalary();
        const oRes = sal.overtimeRes;

        const fmt = v => v === 0 ? '0' : v.toFixed(1);
        const monthEn = MONTHS_EN[month - 1];

        cardsWrapper.innerHTML = `
            <div class="section" id="workHoursSection">
                <div class="card-watermark">${monthEn}</div>
                <div class="stat-header" data-toggle="workHours">
                    <div class="stat-left">
                        <span class="stat-label">Paid Hours</span>
                        <span class="stat-value">${stats.total.toFixed(1)}</span>
                        <span style="font-size:var(--font-caption); color:var(--text-tertiary);">Full ${fullWorkHours.toFixed(1)}</span>
                    </div>
                    <div class="stat-right">
                        <svg class="progress-ring" viewBox="0 0 44 44">
                            <circle class="ring-bg" cx="22" cy="22" r="18"/>
                            <circle class="ring-fill" cx="22" cy="22" r="18" stroke-dasharray="${circ}" stroke-dashoffset="${off}" transform="rotate(-90 22 22)"/>
                        </svg>
                        <svg class="chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" fill="none"/></svg>
                    </div>
                </div>
                <div class="card-body-wrapper"><div class="card-body-inner">
                    <div class="detail-row"><span class="detail-label">${icons.clock} Normal</span><span class="detail-value">${stats.normalTotal.toFixed(1)} h</span></div>
                    <div class="detail-row"><span class="detail-label">${icons.plus} Overtime</span><span class="detail-value">${stats.overtimeTotal.toFixed(1)} h</span></div>
                    <div class="detail-row"><span class="detail-label">${icons.star} Holiday</span><span class="detail-value">${stats.holidayTotal.toFixed(1)} h</span></div>
                    <div class="detail-row"><span class="detail-label">${icons.check} Full-time</span><span class="detail-value"><span class="editable-full-hours" id="fullHoursWrapper"><span class="display-text">${fullWorkHours.toFixed(1)} h</span><input type="number" step="any" inputmode="decimal" id="fullHoursInput"><svg class="edit-icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span></span></div>
                </div></div>
            </div>

            <div class="section" id="overtimePaySection">
                <div class="stat-header" data-toggle="overtimePay">
                    <div class="stat-left">
                        <span class="stat-label">OT Pay</span>
                        <span class="stat-value" id="overtimePayTotal">${oRes.finalOvertimePay.toFixed(1)}</span>
                        <span style="font-size:var(--font-caption); color:var(--text-tertiary);" id="overtimePaySub">Regular ${oRes.normalOvertimePay.toFixed(1)} | Holiday ${oRes.holidayOvertimePay.toFixed(1)}</span>
                    </div>
                    <div class="stat-right">
                        <svg class="stat-icon" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                        <svg class="chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" fill="none"/></svg>
                    </div>
                </div>
                <div class="card-body-wrapper"><div class="card-body-inner">
                    <div class="overtime-row"><span class="overtime-label">${icons.coin} Regular OT</span><span class="overtime-value" id="normalOvertimePayValue">${oRes.normalOvertimePay.toFixed(1)}</span></div>
                    <div class="overtime-row"><span class="overtime-label">${icons.starCoin} Holiday OT</span><span class="overtime-value" id="holidayOvertimePayValue">${oRes.holidayOvertimePay.toFixed(1)}</span></div>
                    <div class="detail-row" style="border-bottom: none; padding-top: 10px;">
                        <span class="detail-label">${icons.pencil} Manual</span>
                        <span class="detail-value" style="display: flex; align-items: center; gap: 6px;">
                            <span class="editable-manual-overtime" id="manualOvertimeWrapper"><span class="display-text" id="manualOvertimeDisplay">${salaryConfig.manualOvertimePay !== null ? salaryConfig.manualOvertimePay.toFixed(1) : '0'}</span><input type="number" step="any" inputmode="decimal" id="manualOvertimeInput"><svg class="edit-icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
                            <button class="reset-icon-btn" id="resetOvertimeBtn" title="Reset to auto">${icons.reset}</button>
                        </span>
                    </div>
                </div></div>
            </div>

            <div class="section" id="salarySection">
                <div class="stat-header" data-toggle="salary">
                    <div class="stat-left">
                        <span class="stat-label">Net Salary</span>
                        <span class="stat-value" id="netSalaryValue">${sal.net.toFixed(1)}</span>
                        <span style="font-size:var(--font-caption); color:var(--text-tertiary);">Gross ${sal.gross.toFixed(1)}</span>
                    </div>
                    <div class="stat-right">
                        <svg class="stat-icon" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                        <svg class="chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" fill="none"/></svg>
                    </div>
                </div>
                <div class="card-body-wrapper"><div class="card-body-inner">
                    <div class="salary-grid">
                        <div class="salary-item"><span class="item-label">${icons.baseSalary} Base</span><input class="item-input" id="baseSalary" value="${fmt(salaryConfig.baseSalary)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.performance} Perf.</span><input class="item-input" id="performance" value="${fmt(salaryConfig.performance)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.otherDeduction} Deduct</span><input class="item-input" id="otherDeduction" value="${fmt(salaryConfig.otherDeduction)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.otherAllowance} Allow.</span><input class="item-input" id="otherAllowance" value="${fmt(salaryConfig.otherAllowance)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.insurance} Insurance</span><input class="item-input" id="insurance" value="${fmt(salaryConfig.insuranceDeduction)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.personalTax} Tax</span><input class="item-input" id="tax" value="${fmt(salaryConfig.personalTax)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.meal} Meal</span><input class="item-input" id="meal" value="${fmt(sal.meal)}" readonly></div>
                        <div class="salary-item"><span class="item-label">${icons.nightAllow} Night</span><input class="item-input" id="nightAllow" value="${fmt(sal.nightAllow)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.rent} Rent</span><input class="item-input" id="rent" value="${fmt(salaryConfig.rentDeduction)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.mealFee} Dining</span><input class="item-input" id="mealFee" value="${fmt(salaryConfig.mealFeeDeduction)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.highTemp} Heat</span><input class="item-input" id="highTemp" value="${fmt(salaryConfig.highTempAllowance)}" step="any" inputmode="decimal"></div>
                        <div class="salary-item"><span class="item-label">${icons.seniority} Seniority</span><input class="item-input" id="seniority" value="${fmt(salaryConfig.seniorityAllowance)}" step="any" inputmode="decimal"></div>
                    </div>
                </div></div>
            </div>
            <div id="calendarArea" class="calendar-section"></div>
        `;

        renderCalendar();
        bindDynamicEvents();
        updateCalendarVisibility();

        const themeBtnText = $('themeBtnText');
        if (themeBtnText) {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            themeBtnText.textContent = isLight ? 'Dark Mode' : 'Light Mode';
        }
        $('menuPrevIcon').innerHTML = getIcon('arrowLeft');
        $('menuNextIcon').innerHTML = getIcon('arrowRight');
    }

    function renderCalendar(){
        const calArea = document.getElementById('calendarArea');
        const days = getDays(year,month), first = getFirstDay(year,month);
        let html = '<div class="calendar-grid">';
        const start = first===0?6:first-1;
        for(let i=0;i<start;i++) html += '<div class="cal-day empty"></div>';
        const labels = {work:'Day', night:'Night', rest:'Rest', holiday:'Hol'};
        for(let d=1; d<=days; d++){
            const row = data[d-1]||{};
            let cls = 'cal-day';
            if(row.shift) cls += ' ' + row.shift;
            const corner = hasNonDefaultOvertime(row) ? '<div class="corner-tag"></div>' : '';
            html += `<div class="${cls}" data-day="${d-1}"><span class="day-number">${d}</span>${row.shift?`<span class="day-label">${labels[row.shift]}</span>`:''}${corner}</div>`;
        }
        html += '</div>';
        calArea.innerHTML = html;
    }

    function toggleDropdown(e) { e.stopPropagation(); dropdownMenu.classList.toggle('show'); }
    function closeDropdown() { dropdownMenu.classList.remove('show'); }

    function setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem(THEME_KEY, 'light');
        } else if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem(THEME_KEY);
        }
        const isLight = document.documentElement.getAttribute('data-theme') === 'light'
                      || (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: light)').matches);
        themeMeta.setAttribute('content', isLight ? '#FF6B44' : '#FF5E3A');
        const btnText = $('themeBtnText');
        if (btnText) btnText.textContent = isLight ? 'Dark Mode' : 'Light Mode';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
        closeDropdown();
        showToast(next === 'dark' ? 'Switched to Dark' : 'Switched to Light');
    }

    function bindStaticEvents() {
        cardsWrapper.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('[data-toggle]');
            if (!toggleBtn || e.target.closest('input, button, .editable-full-hours, .editable-manual-overtime')) return;
            const section = toggleBtn.closest('.section');
            toggleCard(section);
        });

        document.querySelectorAll('#modalShiftSelector .shift-option-big').forEach(b => {
            b.addEventListener('click', ()=> setShiftFromModal(b.dataset.shift));
        });
        $('modalSaveBtn').addEventListener('click', saveModal);
        modalOverlay.addEventListener('click', e => { if(e.target === modalOverlay) closeModal(); });

        $('menuPrevMonth').addEventListener('click', (e) => { e.stopPropagation(); changeMonth(-1); closeDropdown(); });
        $('menuNextMonth').addEventListener('click', (e) => { e.stopPropagation(); changeMonth(1); closeDropdown(); });

        moreBtn.addEventListener('click', toggleDropdown);
        document.addEventListener('click', (e) => {
            if (!moreBtn.contains(e.target) && !dropdownMenu.contains(e.target)) closeDropdown();
        });

        $('switchThemeBtn').addEventListener('click', toggleTheme);
        $('menuExportBackup').addEventListener('click', () => { closeDropdown(); exportBackup(); });
        $('menuImportBackup').addEventListener('click', () => { closeDropdown(); $('backupFileInput').click(); });
        $('menuClearData').addEventListener('click', () => { closeDropdown(); clearCurrentMonth(); });
        $('backupFileInput').addEventListener('change', importBackup);
    }

    function bindDynamicEvents() {
        const fullWrapper = $('fullHoursWrapper');
        if (fullWrapper) {
            const display = fullWrapper.querySelector('.display-text');
            const input = fullWrapper.querySelector('input');
            fullWrapper.addEventListener('click', (e) => {
                if (fullWrapper.classList.contains('editing')) return;
                e.stopPropagation();
                fullWrapper.classList.add('editing');
                input.value = fullWorkHours;
                input.focus();
            });
            const saveFull = () => {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val >= 0) { fullWorkHours = val; saveFullHours(); renderAll(); }
                else input.value = fullWorkHours;
                fullWrapper.classList.remove('editing');
            };
            input.addEventListener('blur', saveFull);
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        }

        const manualWrapper = $('manualOvertimeWrapper');
        if (manualWrapper) {
            const display = manualWrapper.querySelector('.display-text');
            const input = manualWrapper.querySelector('input');
            manualWrapper.addEventListener('click', (e) => {
                if (manualWrapper.classList.contains('editing')) return;
                e.stopPropagation();
                manualWrapper.classList.add('editing');
                input.value = salaryConfig.manualOvertimePay !== null ? salaryConfig.manualOvertimePay : 0;
                input.focus();
            });
            const saveManual = () => {
                const val = parseFloat(input.value);
                if (!isNaN(val) && val >= 0) salaryConfig.manualOvertimePay = (val === 0) ? null : val;
                saveSalaryConfig(); updateSalaryDisplay();
                manualWrapper.classList.remove('editing');
            };
            input.addEventListener('blur', saveManual);
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        }

        $('resetOvertimeBtn')?.addEventListener('click', () => {
            salaryConfig.manualOvertimePay = null;
            saveSalaryConfig(); updateSalaryDisplay();
            const display = document.getElementById('manualOvertimeDisplay');
            if (display) display.textContent = '0';
        });

        const calendarArea = $('calendarArea');
        calendarArea?.addEventListener('click', (e) => {
            const dayEl = e.target.closest('.cal-day:not(.empty)');
            if(!dayEl) return;
            openModal(parseInt(dayEl.dataset.day));
        });

        const bindChange = (id, setter) => {
            const el = $(id); if(!el) return;
            el.addEventListener('change', ()=>{ setter(parseFloat(el.value)||0); saveSalaryConfig(); updateSalaryDisplay(); });
        };
        bindChange('baseSalary', v=>salaryConfig.baseSalary=v);
        bindChange('performance', v=>salaryConfig.performance=v);
        bindChange('otherDeduction', v=>salaryConfig.otherDeduction=v);
        bindChange('otherAllowance', v=>salaryConfig.otherAllowance=v);
        bindChange('insurance', v=>salaryConfig.insuranceDeduction=v);
        bindChange('tax', v=>salaryConfig.personalTax=v);
        bindChange('rent', v=>salaryConfig.rentDeduction=v);
        bindChange('mealFee', v=>salaryConfig.mealFeeDeduction=v);
        bindChange('highTemp', v=>salaryConfig.highTempAllowance=v);
        bindChange('seniority', v=>salaryConfig.seniorityAllowance=v);

        const nightEl = $('nightAllow');
        nightEl?.addEventListener('change', function(){
            const v = this.value.trim();
            const num = parseFloat(v);
            salaryConfig.nightAllowanceManual = (v === '' || isNaN(num)) ? null : num;
            saveSalaryConfig(); updateSalaryDisplay();
        });
    }

    function updateSalaryDisplay(){
        const sal = computeSalary();
        const oRes = sal.overtimeRes;
        const netEl = $('netSalaryValue'); if(netEl) netEl.textContent = sal.net.toFixed(1);
        const grossEl = document.querySelector('#salarySection .stat-left span:last-child');
        if(grossEl) grossEl.textContent = `Gross ${sal.gross.toFixed(1)}`;
        const mealEl = $('meal'); if(mealEl) mealEl.value = sal.meal === 0 ? '0' : sal.meal.toFixed(1);
        const nightEl = $('nightAllow');
        if(nightEl && salaryConfig.nightAllowanceManual===null) nightEl.value = sal.autoNight === 0 ? '0' : sal.autoNight.toFixed(1);
        const otTotal = $('overtimePayTotal'); if(otTotal) otTotal.textContent = oRes.finalOvertimePay.toFixed(1);
        const otSub = $('overtimePaySub');
        if(otSub) otSub.innerHTML = `Regular ${oRes.normalOvertimePay.toFixed(1)} | Holiday ${oRes.holidayOvertimePay.toFixed(1)}`;
        const normalPayVal = $('normalOvertimePayValue'); if(normalPayVal) normalPayVal.textContent = oRes.normalOvertimePay.toFixed(1);
        const holidayPayVal = $('holidayOvertimePayValue'); if(holidayPayVal) holidayPayVal.textContent = oRes.holidayOvertimePay.toFixed(1);
        const manualDisplay = $('manualOvertimeDisplay');
        if(manualDisplay) manualDisplay.textContent = salaryConfig.manualOvertimePay !== null ? salaryConfig.manualOvertimePay.toFixed(1) : '0';
    }

    function changeMonth(delta){
        let nm = month+delta, ny = year;
        if(nm<1){ nm=12; ny--; }
        if(nm>12){ nm=1; ny++; }
        if (ny < 2026 || (ny === 2026 && nm < 1)) return;
        if (ny > 2099) return;
        year = ny; month = nm;
        loadData(); loadSalaryConfig();
        const max = getDays(year,month);
        if (selectedDay == null || selectedDay < 0 || selectedDay >= max) {
            const today = new Date();
            selectedDay = (today.getFullYear() === year && today.getMonth()+1 === month) ? today.getDate()-1 : 0;
        }
        closeModal();
        renderAll();
    }

    function exportBackup() {
        const backup = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(STORAGE_PREFIX) || key.startsWith(SALARY_PREFIX) || key === FULL_HOURS_KEY))
                backup[key] = localStorage.getItem(key);
        }
        const blob = new Blob([JSON.stringify(backup, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const stamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}`;
        a.href = url; a.download = `attendance_backup_${stamp}.json`; a.click();
        URL.revokeObjectURL(url);
        showToast('Backup exported');
    }

    function importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const obj = JSON.parse(e.target.result);
                if (typeof obj !== 'object' || obj === null) throw new Error('Invalid format');
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith(STORAGE_PREFIX) || key.startsWith(SALARY_PREFIX) || key === FULL_HOURS_KEY))
                        localStorage.removeItem(key);
                }
                for (const [key, value] of Object.entries(obj)) localStorage.setItem(key, value);
                const today = new Date();
                let initYear = today.getFullYear(), initMonth = today.getMonth() + 1;
                if (initYear < 2026) { initYear = 2026; initMonth = 1; }
                year = initYear; month = initMonth;
                loadData(); loadSalaryConfig(); loadFullHours();
                const max = getDays(year, month);
                selectedDay = (today.getFullYear() === year && today.getMonth()+1 === month) ? today.getDate()-1 : 0;
                if (selectedDay >= max) selectedDay = 0;
                renderAll();
                showToast('Backup restored');
            } catch (err) { alert('Invalid or corrupted backup file'); }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') setTheme(saved);
        else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        const now = new Date();
        let initYear = now.getFullYear(), initMonth = now.getMonth() + 1;
        if (initYear < 2026 || (initYear === 2026 && initMonth < 1)) { initYear = 2026; initMonth = 1; }
        year = initYear; month = initMonth;
        selectedDay = (now.getFullYear() === year && now.getMonth()+1 === month) ? now.getDate()-1 : 0;
        loadData(); loadSalaryConfig(); loadFullHours();
        bindStaticEvents();
        renderAll();

        // ===== Service Worker 注册（秒开关键！） =====
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('✅ Clocker SW 注册成功'))
                .catch(err => console.log('⚠️ SW 注册失败', err));
        }
    });
})();