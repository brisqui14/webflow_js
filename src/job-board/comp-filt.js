const CompensationFilter = {
    state: {
        salary: {
            min: 40000,
            max: 200000,
            editing: false,
            previousMin: 40000,
            previousMax: 200000
        },
        hourly: {
            min: 15,
            max: 100,
            editing: false,
            previousMin: 15,
            previousMax: 100
        }
    },

    formatValue(value, type) {
        if (type === 'salary') {
            return `$${Math.round(value/1000)}k`;
        }
        return `$${value}`;
    },

    createDualRangeSlider(options) {
        const {
            containerId,
            type, // 'salary' or 'hourly'
            onChange
        } = options;

        const container = document.getElementById(containerId);
        if (!container) return;

        const initialHTML = `
            <div class="compensation-filter">
                <div class="filter-header">
                    <span class="filter-title">${type === 'salary' ? 'Salary Range' : 'Hourly Rate'}</span>
                    <button class="edit-button">Edit</button>
                </div>
                <div class="filter-display">
                    <span class="range-display"></span>
                </div>
                <div class="filter-editor" style="display: none;">
                    <div class="dual-slider-container">
                        <div class="slider-track"></div>
                        <input type="range" 
                            class="range-input min" 
                            min="${type === 'salary' ? 40000 : 15}" 
                            max="${type === 'salary' ? 200000 : 100}" 
                            value="${type === 'salary' ? 40000 : 15}">
                        <input type="range" 
                            class="range-input max" 
                            min="${type === 'salary' ? 40000 : 15}" 
                            max="${type === 'salary' ? 200000 : 100}" 
                            value="${type === 'salary' ? 200000 : 100}">
                    </div>
                    <div class="range-values">
                        <span class="min-value"></span>
                        <span class="max-value"></span>
                    </div>
                    <div class="button-group">
                        <button class="cancel-button">Cancel</button>
                        <button class="apply-button">Apply</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = initialHTML;

        const filterState = this.state[type];
        const editor = container.querySelector('.filter-editor');
        const display = container.querySelector('.filter-display');
        const rangeDisplay = container.querySelector('.range-display');
        const minInput = container.querySelector('.range-input.min');
        const maxInput = container.querySelector('.range-input.max');
        const minValue = container.querySelector('.min-value');
        const maxValue = container.querySelector('.max-value');
        const editButton = container.querySelector('.edit-button');
        const cancelButton = container.querySelector('.cancel-button');
        const applyButton = container.querySelector('.apply-button');
        const track = container.querySelector('.slider-track');

        const updateDisplay = () => {
            const displayText = `${this.formatValue(filterState.min, type)} - ${this.formatValue(filterState.max, type)}${type === 'salary' ? '/year' : '/hour'}`;
            rangeDisplay.textContent = displayText;
            minValue.textContent = this.formatValue(filterState.min, type);
            maxValue.textContent = this.formatValue(filterState.max, type);
        };

        const updateSlider = () => {
            const minPercent = ((filterState.min - minInput.min) / (minInput.max - minInput.min)) * 100;
            const maxPercent = ((filterState.max - minInput.min) / (minInput.max - minInput.min)) * 100;
            
            track.style.background = `linear-gradient(
                to right,
                #e5e7eb 0%,
                #e5e7eb ${minPercent}%,
                #3b82f6 ${minPercent}%,
                #3b82f6 ${maxPercent}%,
                #e5e7eb ${maxPercent}%,
                #e5e7eb 100%
            )`;
        };

        minInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            filterState.min = Math.min(value, filterState.max - (type === 'salary' ? 10000 : 1));
            minInput.value = filterState.min;
            updateDisplay();
            updateSlider();
        });

        maxInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            filterState.max = Math.max(value, filterState.min + (type === 'salary' ? 10000 : 1));
            maxInput.value = filterState.max;
            updateDisplay();
            updateSlider();
        });

        editButton.addEventListener('click', () => {
            filterState.editing = true;
            filterState.previousMin = filterState.min;
            filterState.previousMax = filterState.max;
            editor.style.display = 'block';
            editButton.style.display = 'none';
        });

        cancelButton.addEventListener('click', () => {
            filterState.editing = false;
            filterState.min = filterState.previousMin;
            filterState.max = filterState.previousMax;
            editor.style.display = 'none';
            editButton.style.display = 'block';
            updateDisplay();
            updateSlider();
        });

        applyButton.addEventListener('click', () => {
            filterState.editing = false;
            editor.style.display = 'none';
            editButton.style.display = 'block';
            if (onChange) {
                onChange({
                    min: filterState.min,
                    max: filterState.max
                });
            }
        });

        updateDisplay();
        updateSlider();
    }
};