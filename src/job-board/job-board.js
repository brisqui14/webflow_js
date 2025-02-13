// job-board.js

import CompensationFilter from './comp-filt.js';

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
                salary: null,  
                hourly: null
            }
        },
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
     * Filter Setup
     *******************************************************/
    setupFilters() {
        // Location Type checkboxes
        const locationTypeIds = ['wtoscb', 'wtrecb', 'wthycb', 'wtnscb'];
        const locationTypeValues = ['On-Site', 'Remote', 'Hybrid', 'Not Specified'];
        locationTypeIds.forEach((id, index) => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
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

        // Work Type checkboxes
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

        // Title input
        const titleInput = document.getElementById('search_input');

        // Location input handled by type-ahead setup

        // Radius select
        const radiusSelect = document.getElementById('radius_select');
        if (radiusSelect) {
            radiusSelect.addEventListener('change', (e) => {
                this.state.filters.radiusMiles = parseInt(e.target.value, 10);
            });
        }

        // Search button
        const searchButton = document.getElementById('search_button');
        if (searchButton) {
            searchButton.addEventListener('click', () => {
                if (titleInput) {
                    this.state.filters.title = titleInput.value.trim();
                }

                console.log('Search clicked with filters:', this.state.filters);
                this.refreshJobs();

                if (!this._infiniteScrollSet) {
                    this.setupInfiniteScroll();
                    this._infiniteScrollSet = true;
                }
            });
        }
    },

    /*******************************************************
     * Job Fetching and Filtering
     *******************************************************/
    async fetchJobs() {
        if (this.state.isLoading || !this.state.hasMore) return;
        this.state.isLoading = true;
    
        try {
            let jobs;
            if (this.state.filters.selectedPlaceId) {
                console.log('Using radius-based search with place_id:', this.state.filters.selectedPlaceId);
                // Use radius-based search
                const { data, error } = await window.supabase
                    .rpc('search_jobs_by_radius', {
                        center_place_id: this.state.filters.selectedPlaceId,
                        radius_miles: this.state.filters.radiusMiles,
                        title_search: this.state.filters.title || null,
                        location_type_filter: this.state.filters.locationTypes.length > 0
                            ? this.state.filters.locationTypes
                            : null
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
                    console.log('Using location text search for:', this.state.filters.location);
                    // Use the new RPC function for location text search
                    ({ data, error } = await window.supabase
                        .rpc('search_jobs_by_location_text', {
                            location_text: this.state.filters.location,
                            title_search: this.state.filters.title || null,
                            location_type_filter: this.state.filters.locationTypes.length > 0
                                ? this.state.filters.locationTypes
                                : null
                        }));
                } else {
                    // Standard search without location filter
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
    
            // Apply filters
            let filteredData = jobs || [];
            
            // Location Types filter
            if (this.state.filters.locationTypes.length > 0) {
                console.log('Filtering by location types:', this.state.filters.locationTypes);
                filteredData = filteredData.filter(job =>
                    job.processed_location_types?.some(type =>
                        this.state.filters.locationTypes.includes(type)
                    )
                );
            }
    
            // Work Types filter
            if (this.state.filters.workTypes.length > 0) {
                console.log('Filtering by work types:', this.state.filters.workTypes);
                filteredData = filteredData.filter(job =>
                    job.processed_work_types?.some(type =>
                        this.state.filters.workTypes.includes(type)
                    )
                );
            }
    
            // Compensation filter
            if (this.state.filters.compensation.salary || this.state.filters.compensation.hourly) {
                console.log('Filtering by compensation:', this.state.filters.compensation);
                filteredData = filteredData.filter(job => {
                    if (!job.processed_comp || !job.comp_frequency) return false;
                    
                    const salaryFilter = this.state.filters.compensation.salary;
                    const hourlyFilter = this.state.filters.compensation.hourly;
                    
                    if (job.comp_frequency === 'yearly' && salaryFilter) {
                        return job.comp_min_value >= salaryFilter.min && 
                               job.comp_max_value <= salaryFilter.max;
                    }
                    
                    if (job.comp_frequency === 'hourly' && hourlyFilter) {
                        return job.comp_min_value >= hourlyFilter.min && 
                               job.comp_max_value <= hourlyFilter.max;
                    }
                    
                    return false;
                });
            }
    
            // Update results count
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
    
            // Render jobs
            console.log('Rendering', filteredData.length, 'jobs after all filters');
            for (const job of filteredData) {
                const jobElement = await this.createJobElement(job);
                jobsContainer.appendChild(jobElement);
            }
    
            this.state.hasMore = false;
        } catch (err) {
            console.error('Error loading jobs:', err);
            this.state.totalResults = 0;
            this.updateResultsCount();
        } finally {
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
                    : `$${value}/hr`;
                    
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
    }
};

export default JobBoard;