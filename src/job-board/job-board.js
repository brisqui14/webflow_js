// job-board.js
const JobBoard = {
    state: {
        currentPage: 1,
        isLoading: false,
        hasMore: true,
        totalResults: 0,
        filters: {
            title: '',
            location: '',
            selectedPlaceId: null,
            radiusMiles: 25,
            locationTypes: [],
            workTypes: [],
            compensation: {
                minSalary: null,
                minHourly: null,
                includeUndefined: true
            }
        },
        currentState: 'stateA', // Initialize to State A (search/edit mode)
    },

    /*******************************************************
     * State Management
     *******************************************************/
    // Transition to State A (search/edit mode)
    transitionToStateA() {
        this.state.currentState = 'stateA';
        document.getElementById('filter-edit').style.display = 'block';
        document.getElementById('filter-view').style.display = 'none';
    },

    // Transition to State B (results/view mode)
    transitionToStateB() {
        // First update the view-only display
        this.updateFilterViewDisplay();
        
        // Then switch visibility
        this.state.currentState = 'stateB';
        document.getElementById('filter-edit').style.display = 'none';
        document.getElementById('filter-view').style.display = 'block';
    },

    // Updates all the view-only fields based on current filter state
updateFilterViewDisplay() {
    try {
        // Title
        const titleElement = document.getElementById('title-view');
        if (titleElement) {
            const titleInput = document.getElementById('search_input');
            const titleValue = titleInput ? titleInput.value.trim() : '';
            titleElement.textContent = titleValue || 'N/A';
        }

        // Employment Types
        this.updateCheckboxGroupView(
            ['etftcb', 'etptcb', 'etcocb', 'etsecb', 'etlecb', 'etnscb'],
            ['Full-Time', 'Part-Time', 'Contract', 'Seasonal', 'Learning Experience Opportunity', 'Not Specified'],
            'emp-view'
        );

        // Workplace Types
        this.updateCheckboxGroupView(
            ['wtoscb', 'wtrecb', 'wthycb', 'wtnscb'],
            ['On-Site', 'Remote', 'Hybrid', 'Not Specified'],
            'wkpl-view'
        );

        // Location
        const locationElement = document.getElementById('loc-view');
        if (locationElement) {
            const locationInput = document.getElementById('location_search_input');
            const locationValue = locationInput ? locationInput.value.trim() : '';
            locationElement.textContent = locationValue || 'N/A';
        }

        // Radius (only show if location is defined)
        const radiusView = document.getElementById('rad-view');
        if (radiusView) {
            const locationInput = document.getElementById('location_search_input');
            const locationValue = locationInput ? locationInput.value.trim() : '';
            
            // Get the radius select - if it doesn't exist, don't try to access options
            const radiusSelect = document.getElementById('radius_select');
            let selectedRadius = 'Within 25 miles'; // Default value
            
            if (radiusSelect && radiusSelect.options && radiusSelect.options.length > 0) {
                try {
                    selectedRadius = radiusSelect.options[radiusSelect.selectedIndex].text;
                } catch (e) {
                    console.log('Could not get selected radius text, using default');
                }
            }
            
            if (locationValue) {
                radiusView.textContent = selectedRadius;
                if (radiusView.parentElement) {
                    radiusView.parentElement.style.display = 'block';
                }
            } else if (radiusView.parentElement) {
                radiusView.parentElement.style.display = 'none';
            }
        }

        // Minimum Salary
        const minSalaryView = document.getElementById('mins-view');
        if (minSalaryView) {
            const minSalaryInput = document.getElementById('min-salary-input');
            const minSalaryValue = minSalaryInput ? minSalaryInput.value.trim() : '';
            minSalaryView.textContent = minSalaryValue 
                ? `$${parseInt(minSalaryValue).toLocaleString()}/year` 
                : 'N/A';
        }

        // Minimum Hourly
        const minHourlyView = document.getElementById('minh-view');
        if (minHourlyView) {
            const minHourlyInput = document.getElementById('min-hourly-input');
            const minHourlyValue = minHourlyInput ? minHourlyInput.value.trim() : '';
            minHourlyView.textContent = minHourlyValue 
                ? `$${minHourlyValue}/hour` 
                : 'N/A';
        }

        // Include Jobs with Undefined Pay
        const includeUndefinedView = document.getElementById('inccb-view');
        if (includeUndefinedView) {
            const includeUndefinedCheckbox = document.getElementById('coijcb');
            const includeUndefinedPay = includeUndefinedCheckbox ? includeUndefinedCheckbox.checked : true;
            includeUndefinedView.textContent = includeUndefinedPay ? 'Yes' : 'No';
        }

        // Posted Date - Since this isn't implemented yet, just show a default value
        const postedDateView = document.getElementById('age-view');
        if (postedDateView) {
            postedDateView.textContent = 'Any Time';
        }
    } catch (error) {
        console.error('Error updating filter view display:', error);
        // Continue execution despite errors - don't let view updates
        // block the state transition
    }
},

    // Helper method to update checkbox group displays
    updateCheckboxGroupView(ids, labels, viewElementId) {
        const checkedValues = [];
        ids.forEach((id, index) => {
            if (document.getElementById(id).checked) {
                checkedValues.push(labels[index]);
            }
        });

        const viewElement = document.getElementById(viewElementId);
        if (checkedValues.length === 0) {
            // None selected
            viewElement.textContent = 'None';
        } else if (checkedValues.length === labels.length) {
            // All selected
            viewElement.textContent = 'All';
        } else {
            // Some selected
            viewElement.textContent = checkedValues.join(', ');
        }
    },

    // Setup event listeners for state transitions
    setupStateTransitions() {
        // Search button transitions from State A to State B
        const searchButton = document.getElementById('search_button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                this.transitionToStateB();
            });
        }

        // Clicking on filter-view transitions from State B to State A
        const filterView = document.getElementById('filter-view');
        if (filterView) {
            filterView.addEventListener('click', (e) => {
                // Only transition if clicking on the container itself or a filter item
                // (not on the "Edit" button which has its own handler)
                if (!e.target.classList.contains('edit-filters-btn')) {
                    this.transitionToStateA();
                }
            });
        }

        // Add edit button in view mode
        const editButton = document.querySelector('.edit-filters-btn');
        if (editButton) {
            editButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the container click from firing
                this.transitionToStateA();
            });
        }
    },

    // Ensure proper HTML structure for filter view
    ensureFilterViewStructure() {
        // Ensure filter-view has proper structure if not already set up
        const filterView = document.getElementById('filter-view');
        if (filterView && !filterView.querySelector('.filter-view-container')) {
            // Create header
            const header = document.createElement('div');
            header.className = 'filter-header';
            
            const title = document.createElement('div');
            title.className = 'filter-title';
            title.textContent = 'Active Filters';
            
            const editButton = document.createElement('button');
            editButton.className = 'edit-filters-btn';
            editButton.textContent = 'Edit';
            
            header.appendChild(title);
            header.appendChild(editButton);
            
            // Create container for filter items
            const container = document.createElement('div');
            container.className = 'filter-view-container';
            
            // Define all the filter fields
            const filterFields = [
                { id: 'title-view', label: 'Job Title' },
                { id: 'emp-view', label: 'Employment Type' },
                { id: 'wkpl-view', label: 'Workplace Type' },
                { id: 'loc-view', label: 'Location' },
                { id: 'rad-view', label: 'Within Miles' },
                { id: 'mins-view', label: 'Min. Salary' },
                { id: 'minh-view', label: 'Min. Hourly Rate' },
                { id: 'inccb-view', label: 'Include Undefined Pay' },
                { id: 'age-view', label: 'Posted Date' }
            ];
            
            // Create each filter item
            filterFields.forEach(field => {
                const item = document.createElement('div');
                item.className = 'filter-item';
                
                const label = document.createElement('div');
                label.className = 'filter-label';
                label.textContent = field.label;
                
                const value = document.createElement('div');
                value.className = 'filter-value';
                value.id = field.id;
                value.textContent = 'N/A';
                
                item.appendChild(label);
                item.appendChild(value);
                container.appendChild(item);
            });
            
            // Clear and append new structure
            filterView.innerHTML = '';
            filterView.appendChild(header);
            filterView.appendChild(container);
        }
    },

    /*******************************************************
     * Location Type-ahead Implementation
     *******************************************************/
    async setupLocationTypeahead() {
        const locationInput = document.getElementById('location_search_input');
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'location-suggestions';
        suggestionsContainer.style.display = 'none';
        locationInput.parentNode.insertBefore(suggestionsContainer, locationInput.nextSibling);

        let typeaheadTimeout;

        locationInput.addEventListener('input', async (e) => {
            clearTimeout(typeaheadTimeout);
            this.state.filters.selectedPlaceId = null;
           
            const searchTerm = e.target.value.trim();
            this.state.filters.location = searchTerm; // Update location filter

            if (searchTerm.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            typeaheadTimeout = setTimeout(async () => {
                try {
                    const { data: locations, error } = await window.supabase
                        .rpc('search_location_typeahead', {
                            search_term: searchTerm,
                            limit_count: 5
                        });

                    if (error) throw error;

                    suggestionsContainer.innerHTML = '';
                    if (locations.length > 0) {
                        locations.forEach(loc => {
                            const div = document.createElement('div');
                            div.className = 'location-suggestion';
                            div.textContent = loc.display_name;
                            div.addEventListener('click', () => {
                                locationInput.value = loc.display_name;
                                this.state.filters.selectedPlaceId = loc.place_id;
                                this.state.filters.location = loc.display_name;
                                suggestionsContainer.style.display = 'none';
                            });
                            suggestionsContainer.appendChild(div);
                        });
                        suggestionsContainer.style.display = 'block';
                    } else {
                        suggestionsContainer.style.display = 'none';
                    }
                } catch (err) {
                    console.error('Error fetching location suggestions:', err);
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!suggestionsContainer.contains(e.target) && e.target !== locationInput) {
                suggestionsContainer.style.display = 'none';
            }
        });
    },

    /*******************************************************
     * Compensation Filters Implementation
     *******************************************************/
    setupCompensationFilters() {
        const salaryMinInput = document.getElementById('min-salary-input');
        const hourlyMinInput = document.getElementById('min-hourly-input');
        const includeUndefinedPayCheckbox = document.getElementById('coijcb');
        
        // Set up event listeners for inputs
        if (salaryMinInput) {
            salaryMinInput.addEventListener('input', (e) => {
                const value = e.target.value.trim() ? parseFloat(e.target.value) : null;
                this.state.filters.compensation.minSalary = value;
            });
        }
        
        if (hourlyMinInput) {
            hourlyMinInput.addEventListener('input', (e) => {
                const value = e.target.value.trim() ? parseFloat(e.target.value) : null;
                this.state.filters.compensation.minHourly = value;
            });
        }
        
        if (includeUndefinedPayCheckbox) {
            // Initialize from current checkbox state
            this.state.filters.compensation.includeUndefined = includeUndefinedPayCheckbox.checked;
            includeUndefinedPayCheckbox.addEventListener('change', (e) => {
                this.state.filters.compensation.includeUndefined = e.target.checked;
            });
        }
    },

    /*******************************************************
     * Filter Setup
     *******************************************************/
    setupFilters() {
        // 1. Clear or initialize these arrays so we can re-populate them
        this.state.filters.locationTypes = [];
        this.state.filters.workTypes = [];

        // 2. Location Type checkboxes
        const locationTypeIds = ['wtoscb', 'wtrecb', 'wthycb', 'wtnscb'];
        const locationTypeValues = ['On-Site', 'Remote', 'Hybrid', 'Not Specified'];

        locationTypeIds.forEach((id, index) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                // If the box is already checked on page load, add it to the array
                if (checkbox.checked) {
                    this.state.filters.locationTypes.push(locationTypeValues[index]);
                }
                // Listen for user toggles
                checkbox.addEventListener('change', () => {
                    const value = locationTypeValues[index];
                    if (checkbox.checked) {
                        this.state.filters.locationTypes.push(value);
                    } else {
                        this.state.filters.locationTypes =
                            this.state.filters.locationTypes.filter(type => type !== value);
                    }
                });
            }
        });

        // 3. Work Type checkboxes
        const workTypeIds = ['etftcb', 'etptcb', 'etcocb', 'etsecb', 'etlecb', 'etnscb'];
        const workTypeValues = [
            'Full-Time',
            'Part-Time',
            'Contract',
            'Seasonal',
            'Learning Experience Opportunity',
            'Not Specified'
        ];

        workTypeIds.forEach((id, index) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                // If the box is already checked on page load, add it
                if (checkbox.checked) {
                    this.state.filters.workTypes.push(workTypeValues[index]);
                }
                // Listen for changes
                checkbox.addEventListener('change', () => {
                    const value = workTypeValues[index];
                    if (checkbox.checked) {
                        this.state.filters.workTypes.push(value);
                    } else {
                        this.state.filters.workTypes =
                            this.state.filters.workTypes.filter(type => type !== value);
                    }
                });
            }
        });

        // 4. Title input
        const titleInput = document.getElementById('search_input');
        // (Location input is handled by your typeahead setup, so we skip it here.)

        // 5. Radius select
        const radiusSelect = document.getElementById('radius_select');
        if (radiusSelect) {
            radiusSelect.addEventListener('change', (e) => {
                this.state.filters.radiusMiles = parseInt(e.target.value, 10);
            });
        }

        // 6. Search button
        const searchButton = document.getElementById('search_button');
        if (searchButton) {
            // Modify the search button to handle both search and state transition
            searchButton.addEventListener('click', () => {
                // Update the title filter
                if (titleInput) {
                    this.state.filters.title = titleInput.value.trim();
                }
                
                // Log and refresh jobs
                console.log('Search clicked with filters:', this.state.filters);
                this.refreshJobs();

                if (!this._infiniteScrollSet) {
                    this.setupInfiniteScroll();
                    this._infiniteScrollSet = true;
                }
                
                // Transition to State B after search initiated
                this.transitionToStateB();
            });
        }
    },

    /*******************************************************
     * Job Fetching and Filtering
     *******************************************************/
    async fetchJobs() {
        // Prevent simultaneous requests or loading past the final page.
        if (this.state.isLoading || !this.state.hasMore) return;
        this.state.isLoading = true;
    
        // Define the full set of possible values for each filter group
        // so we can detect "all selected" vs. "none" vs. partial.
        const allLocationTypes = ['On-Site', 'Remote', 'Hybrid', 'Not Specified'];
        const allWorkTypes = [
            'Full-Time',
            'Part-Time',
            'Contract',
            'Seasonal',
            'Learning Experience Opportunity',
            'Not Specified'
        ];
    
        // Get what's currently selected in state
        const selectedLocationTypes = this.state.filters.locationTypes || [];
        const selectedWorkTypes = this.state.filters.workTypes || [];
    
        // Determine the final "filter arrays" based on all/none/partial logic
        let locationTypeFilter;
        if (selectedLocationTypes.length === 0) {
            // None selected => no results
            locationTypeFilter = [];
        } else if (selectedLocationTypes.length === allLocationTypes.length) {
            // All selected => skip location filter
            locationTypeFilter = null;
        } else {
            // Partial => filter by the selected values
            locationTypeFilter = selectedLocationTypes;
        }
    
        let workTypeFilter;
        if (selectedWorkTypes.length === 0) {
            // None selected => no results
            workTypeFilter = [];
        } else if (selectedWorkTypes.length === allWorkTypes.length) {
            // All selected => skip employment filter
            workTypeFilter = null;
        } else {
            // Partial => filter by the selected values
            workTypeFilter = selectedWorkTypes;
        }
    
        try {
            let jobs;
    
            // If either filter is an empty array, we already know results are zero
            if (
                (Array.isArray(locationTypeFilter) && locationTypeFilter.length === 0) ||
                (Array.isArray(workTypeFilter) && workTypeFilter.length === 0)
            ) {
                console.log('No results: locationTypeFilter or workTypeFilter is empty.');
                jobs = [];
            } else {
                // Proceed with existing DB logic
    
                if (this.state.filters.selectedPlaceId) {
                    // Radius-based search
                    console.log('Using radius-based search with place_id:', this.state.filters.selectedPlaceId);
                    const { data, error } = await window.supabase
                        .rpc('search_jobs_by_radius', {
                            center_place_id: this.state.filters.selectedPlaceId,
                            radius_miles: this.state.filters.radiusMiles,
                            title_search: this.state.filters.title || null,
                            // Pass locationTypeFilter (if null => no filter, if array => filter).
                            location_type_filter: locationTypeFilter
                            // If your DB RPC also supports a work type filter param, add it here
                        });
    
                    if (error) throw error;
                    jobs = data;
                    console.log('Radius search results:', jobs?.length || 0, 'jobs found');
    
                } else {
                    // Standard search or location text search
                    console.log('Using standard search with filters:', {
                        title: this.state.filters.title,
                        location: this.state.filters.location,
                        locationTypes: this.state.filters.locationTypes,
                        workTypes: this.state.filters.workTypes,
                        compensation: this.state.filters.compensation
                    });
    
                    let data, error;
                    if (this.state.filters.location && !this.state.filters.selectedPlaceId) {
                        // Use new RPC for location text search
                        console.log('Using location text search for:', this.state.filters.location);
                        ({ data, error } = await window.supabase
                            .rpc('search_jobs_by_location_text', {
                                location_text: this.state.filters.location,
                                title_search: this.state.filters.title || null,
                                location_type_filter: locationTypeFilter
                                // If your RPC also accepts a workTypeFilter, pass it here
                            }));
                    } else {
                        // Standard search without location constraints
                        ({ data, error } = await window.supabase
                            .from('production_jobs')
                            .select(`
                                job_id,
                                title,
                                description,
                                job_url,
                                processed_location_types,
                                processed_work_types,
                                processed_comp,
                                comp_frequency,
                                comp_min_value,
                                comp_max_value,
                                production_companies (
                                    company_id,
                                    name,
                                    company_url,
                                    logo_url
                                ),
                                production_job_locations!production_job_locations_job_fkey (
                                    is_primary,
                                    place_id,
                                    structured_locations (
                                        place_id,
                                        formatted_address
                                    )
                                )
                            `)
                            .order('created_at', { ascending: false })
                            .ilike('title', this.state.filters.title ? `%${this.state.filters.title}%` : '%'));
                    }
                    if (error) throw error;
                    jobs = data;
                    console.log('Standard search results:', jobs?.length || 0, 'jobs found');
                }
            }
    
            // Front-end filtering (if needed) -- if your DB logic already filters, adjust accordingly.
            let filteredData = jobs || [];
    
            // Location Types filter
            // locationTypeFilter === null => skip filtering
            // locationTypeFilter is an array => do partial filtering
            if (Array.isArray(locationTypeFilter) && locationTypeFilter.length > 0) {
                console.log('Filtering by location types:', locationTypeFilter);
                filteredData = filteredData.filter(job =>
                    job.processed_location_types?.some(type => locationTypeFilter.includes(type))
                );
            }
    
            // Work Types filter
            // workTypeFilter === null => skip filtering
            // workTypeFilter is an array => do partial filtering
            if (Array.isArray(workTypeFilter) && workTypeFilter.length > 0) {
                console.log('Filtering by work types:', workTypeFilter);
                filteredData = filteredData.filter(job =>
                    job.processed_work_types?.some(type => workTypeFilter.includes(type))
                );
            }
    
            // Compensation filters
            const compFilters = this.state.filters.compensation;
            const minSalary = compFilters.minSalary;
            const minHourly = compFilters.minHourly;
            const includeUndefined = compFilters.includeUndefined;
    
            // Check whether user has set any min pay filters
            const hasCompFilters = (minSalary !== null && minSalary !== undefined) ||
                                   (minHourly !== null && minHourly !== undefined);
    
            if (hasCompFilters) {
                console.log('Filtering by compensation minimums:', compFilters);
                filteredData = filteredData.filter(job => {
                    // If job has no comp info
                    if (!job.processed_comp || !job.comp_frequency) {
                        return includeUndefined;
                    }
    
                    // If job is yearly & user set a minSalary
                    if (job.comp_frequency === 'yearly' && minSalary !== null && minSalary !== undefined) {
                        return job.comp_min_value >= minSalary;
                    }
    
                    // If job is hourly & user set a minHourly
                    if (job.comp_frequency === 'hourly' && minHourly !== null && minHourly !== undefined) {
                        return job.comp_min_value >= minHourly;
                    }
    
                    // If none of the above conditions matched, pass it through
                    return true;
                });
            }
    
            // If includeUndefined = false, remove jobs that don't have compensation data
            if (!includeUndefined) {
                console.log('Filtering out jobs with undefined compensation');
                filteredData = filteredData.filter(job => {
                    return (
                        job.processed_comp !== null &&
                        job.processed_comp !== undefined &&
                        job.comp_frequency !== null &&
                        job.comp_frequency !== undefined &&
                        job.comp_min_value !== null &&
                        job.comp_min_value !== undefined
                    );
                });
            }
    
            // Update count
            this.state.totalResults = filteredData.length;
            this.updateResultsCount();
    
            // Clear existing listings
            const jobsContainer = document.querySelector('#job-listings-container');
            const template = jobsContainer.querySelector('.job-listing');
            if (template) {
                template.style.display = 'none';
            }
            while (jobsContainer.children.length > 1) {
                jobsContainer.removeChild(jobsContainer.lastChild);
            }
    
            // Render the filtered jobs
            console.log('Rendering', filteredData.length, 'jobs after all filters');
            for (const job of filteredData) {
                const jobElement = await this.createJobElement(job);
                jobsContainer.appendChild(jobElement);
            }
    
            // We've rendered all possible results, so no more to load
            this.state.hasMore = false;
    
        } catch (err) {
            console.error('Error loading jobs:', err);
            this.state.totalResults = 0;
            this.updateResultsCount();
        } finally {
            // Always stop the loading spinner
            this.state.isLoading = false;
        }
    },    

    updateResultsCount() {
        const resultsCounter = document.getElementById('results-counter');
        if (resultsCounter) {
            resultsCounter.textContent = `${this.state.totalResults} ${
                this.state.totalResults === 1 ? 'job' : 'jobs'
            } found`;
        }
    },

    /*******************************************************
     * Job Element Creation and Display
     *******************************************************/
    async createJobElement(job) {
        const element = document.createElement('div');
        element.className = 'job-listing';
        
        // Format compensation if it exists
        let compensationHTML = '';
        if (job.processed_comp) {
            const formatValue = (value) => job.comp_frequency === 'yearly' 
                ? `$${Math.round(value/1000)}k` 
                : `$${value}`;
                
            compensationHTML = `
                <div class="job-compensation">
                    ${job.processed_comp === 'fixed' 
                        ? formatValue(job.comp_min_value)
                        : `${formatValue(job.comp_min_value)} - ${formatValue(job.comp_max_value)}`
                    }
                    ${job.comp_frequency === 'yearly' ? '/year' : '/hour'}
                </div>`;
        }

        element.innerHTML = `
            <div class="job-header">
                <h3 class="job-title"></h3>
                ${compensationHTML}
            </div>
            <p class="job-company-location">
                <span class="job-company"></span>
                ${job.distance_miles ? `<span class="job-distance">(${job.distance_miles.toFixed(1)} miles)</span>` : ''}
            </p>
            <div class="job-locations"></div>
        `;
       
        element.querySelector('.job-title').textContent = job.title;
        element.querySelector('.job-company').textContent = job.production_companies?.name || '';
   
        // Display all locations
        const locationsDiv = element.querySelector('.job-locations');
        if (job.production_job_locations && job.production_job_locations.length > 0) {
            job.production_job_locations.forEach(loc => {
                if (loc.structured_locations?.formatted_address) {
                    const locSpan = document.createElement('div');
                    locSpan.className = 'job-location';
                    locSpan.textContent = loc.structured_locations.formatted_address;
                    locationsDiv.appendChild(locSpan);
                }
            });
        } else {
            const locSpan = document.createElement('div');
            locSpan.className = 'job-location';
            locSpan.textContent = 'Location not specified';
            locationsDiv.appendChild(locSpan);
        }
   
        element.style.cursor = 'pointer';
        element.addEventListener('click', () => {
            document.querySelectorAll('.job-listing.selected').forEach(el => {
                el.classList.remove('selected');
            });
            element.classList.add('selected');
            this.showJobDetails(job);
        });
   
        return element;
    },

    async showJobDetails(job) {
        const detailContainer = document.getElementById('job-detail-container');
        const titleElement = detailContainer.querySelector('.job-detail-title');
        const contentElement = detailContainer.querySelector('.job-detail-content');
   
        titleElement.textContent = 'Loading...';
        contentElement.innerHTML = '<div class="loading-spinner"></div>';
        detailContainer.classList.add('job-detail-visible');
        document.querySelector('.job-board-container').classList.add('show-detail');
   
        console.log("Job Data:", job); // Debugging line
        console.log("Job URL:", job.job_url); // Debugging line
   
        try {
            const locationsHTML = job.production_job_locations && job.production_job_locations.length > 0
                ? job.production_job_locations
                    .filter(loc => loc.structured_locations?.formatted_address)
                    .map(loc => `<p>${loc.structured_locations.formatted_address}</p>`)
                    .join('')
                : '<p>Location not specified</p>';
   
            // Clear previous content
            titleElement.innerHTML = '';
   
            // Create title text element
            const titleText = document.createElement('span');
            titleText.textContent = job.title;
   
            // Append title
            titleElement.appendChild(titleText);
   
            // Check if job has a URL and create an Apply button
            if (job.job_url) {
                const applyButton = document.createElement('a');
                applyButton.href = job.job_url;
                applyButton.target = '_blank';
                applyButton.className = 'apply-button';
                applyButton.textContent = 'Apply Now';
   
                // Append the button next to the title
                titleElement.appendChild(applyButton);
            }
   
            // Format compensation if it exists
            let compensationHTML = '';
            if (job.processed_comp) {
                const formatValue = (value) => job.comp_frequency === 'yearly' 
                    ? `$${Math.round(value/1000)}k` 
                    : `$${value}`;
                    
                compensationHTML = `
                    <div class="job-compensation-detail">
                        <span class="compensation-label">Compensation:</span>
                        <span class="compensation-value">
                            ${job.processed_comp === 'fixed' 
                                ? formatValue(job.comp_min_value)
                                : `${formatValue(job.comp_min_value)} - ${formatValue(job.comp_max_value)}`
                            }
                            ${job.comp_frequency === 'yearly' ? ' per year' : ' per hour'}
                        </span>
                    </div>`;
            }

            const contentHTML = `
                <div class="job-company-header">
                    ${
                        job.production_companies?.logo_url
                            ? `<img src="${job.production_companies.logo_url}"
                                alt="${job.production_companies.name}"
                                class="company-logo">`
                            : ''
                    }
                    <div class="company-info">
                        <h3 class="company-name">${job.production_companies?.name || ''}</h3>
                        <div class="company-details">
                            ${compensationHTML}
                            ${job.distance_miles ? `<p class="job-distance">${job.distance_miles.toFixed(1)} miles away</p>` : ''}
                            <div class="job-locations">${locationsHTML}</div>
                        </div>
                    </div>
                </div>
                <div class="job-tags">
                    ${
                        (job.processed_work_types || [])
                            .map(type => `<span class="job-tag">${type}</span>`)
                            .join('')
                    }
                </div>
                <div class="job-description">
                    ${job.description || ''}
                </div>
            `;
            contentElement.innerHTML = contentHTML;
        } catch (error) {
            console.error('Error loading job details:', error);
            contentElement.innerHTML = `<div class="error-message">
                Error loading job details: ${error.message}
            </div>`;
        }
    },
   
   
    /*******************************************************
     * Utility Functions
     *******************************************************/
    refreshJobs() {
        const jobsContainer = document.querySelector('#job-listings-container');
        if (jobsContainer) {
            this.state.hasMore = true;
            this.fetchJobs();
        }
    },

    setupInfiniteScroll() {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !this.state.isLoading) {
                    this.fetchJobs();
                }
            });
        }, options);
        const sentinel = document.createElement('div');
        sentinel.id = 'infinite-scroll-sentinel';
        document.querySelector('#job-listings-container').appendChild(sentinel);
        observer.observe(sentinel);
    },

    /*******************************************************
     * Initialization
     *******************************************************/
    init() {
        const jobsContainer = document.querySelector('#job-listings-container');
        if (!jobsContainer) {
            console.error('Job listings container not found');
            return;
        }

        // Add results counter
        const resultsCounter = document.createElement('div');
        resultsCounter.id = 'results-counter';
        resultsCounter.className = 'results-counter';
        jobsContainer.insertBefore(resultsCounter, jobsContainer.firstChild);

        // Set up location typeahead
        this.setupLocationTypeahead();

        // Set up filters
        this.setupFilters();
        
        // Set up compensation filters
        this.setupCompensationFilters();

        // Set up detail view close button
        const closeButton = document.querySelector('.job-detail-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                document.getElementById('job-detail-container')
                    .classList.remove('job-detail-visible');
                document.querySelector('.job-board-container')
                    .classList.remove('show-detail');
            });
        }
        
        // Initialize state management
        this.ensureFilterViewStructure();
        this.setupStateTransitions();
        this.transitionToStateA(); // Start in State A
    }
};

export default JobBoard;