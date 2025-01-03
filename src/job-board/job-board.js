// webflow_js/src/job-board/job-board.js

// JobBoard module
const JobBoard = {
  // State management
  state: {
      currentPage: 1,
      isLoading: false,
      hasMore: true,
      filters: {
          title: null,
          location: null,
          locationRange: null,
          locationType: [],
          workType: [],
          company: null,
          keywords: [],
          compensationMin: null,
          compensationMax: null
      }
  },

  // Constants
  PAGE_SIZE: 20,
  PREVIEW_FIELDS: `
      job_id,
      company_id,
      title,
      job_url,
      department,
      team,
      processed_locations,
      processed_location_types,
      processed_work_types,
      processed_keywords,
      processed_comp,
      production_companies (
          company_id,
          name,
          company_url,
          logo_url
      )
  `,

  async fetchJobs() {
    if (this.state.isLoading || !this.state.hasMore) return;
  
    this.state.isLoading = true;
  
    try {
      let { data, error, count } = await supabase
        .from('production_jobs')
        .select(this.PREVIEW_FIELDS, { count: 'exact' })
        .range(
          (this.state.currentPage - 1) * this.PAGE_SIZE,
          this.state.currentPage * this.PAGE_SIZE - 1
        )
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      // Filter out duplicates so we only get one job per company_id
      const seenCompanyIds = new Set();
      const uniqueJobs = [];
      for (const job of data) {
        if (!seenCompanyIds.has(job.company_id)) {
          uniqueJobs.push(job);
          seenCompanyIds.add(job.company_id);
        }
      }
  
      // Now `uniqueJobs` has only one job per company
      const jobsContainer = document.querySelector('#job-listings-container');
  
      // Remove template if it's the first load
      if (this.state.currentPage === 1) {
        const template = jobsContainer.querySelector('.job-listing');
        if (template) {
          template.style.display = 'none';
        }
      }
  
      uniqueJobs.forEach(job => {
        const jobElement = this.createJobElement(job);
        jobsContainer.appendChild(jobElement);
      });
  
      this.state.hasMore = data.length === this.PAGE_SIZE;
      this.state.currentPage++;
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      this.state.isLoading = false;
    }
  },

  async showJobDetails(jobId) {
      const detailContainer = document.getElementById('job-detail-container');
      const titleElement = detailContainer.querySelector('.job-detail-title');
      const contentElement = detailContainer.querySelector('.job-detail-content');
      
      // Show loading state
      titleElement.textContent = 'Loading...';
      contentElement.innerHTML = '<div class="loading-spinner"></div>';
      detailContainer.classList.add('job-detail-visible');
      document.querySelector('.job-board-container').classList.add('show-detail');

      try {
          // Fetch job details including description
          const { data, error } = await window.supabase
              .from('production_jobs')
              .select(`
                  *,
                  production_companies (
                      name,
                      logo_url
                  )
              `)
              .eq('job_id', jobId)
              .single();

          if (error) throw error;

          // Update content
          titleElement.textContent = data.title;
          
          // Create content HTML
          const contentHTML = `
              <div class="job-company-header">
                  ${data.production_companies?.logo_url ? 
                      `<img src="${data.production_companies.logo_url}" 
                       alt="${data.production_companies.name}" 
                       class="company-logo">` : ''
                  }
                  <div class="company-info">
                      <h3>${data.production_companies?.name || ''}</h3>
                      <p>${data.processed_locations?.[0] || ''}</p>
                  </div>
              </div>
              <div class="job-tags">
                  ${(data.processed_work_types || [])
                      .map(type => `<span class="job-tag">${type}</span>`)
                      .join('')
                  }
              </div>
              <div class="job-description">
                  ${data.description || ''}
              </div>
          `;
          
          contentElement.innerHTML = contentHTML;

      } catch (error) {
          contentElement.innerHTML = `<div class="error-message">
              Error loading job details: ${error.message}
          </div>`;
      }
  },

  createJobElement(job) {
      const template = document.querySelector('.job-listing');
      const element = template.cloneNode(true);
      
      // Remove any template-specific classes/attributes
      element.removeAttribute('style');
      
      // Set job details
      element.querySelector('.job-title').textContent = job.title;
      element.querySelector('.job-company').textContent = job.production_companies?.name || '';
      element.querySelector('.job-location').textContent = job.processed_locations?.[0] || '';
      
      // Make the entire job listing clickable
      element.style.cursor = 'pointer';
      element.addEventListener('click', () => {
          this.showJobDetails(job.job_id);
      });
  
      return element;
  },

  setupInfiniteScroll() {
      const options = {
          root: null,
          rootMargin: '100px',
          threshold: 0.1
      };
  
      const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
              if (entry.isIntersecting && !this.state.isLoading) {
                  this.fetchJobs();
              }
          });
      }, options);
  
      // Create and observe sentinel element
      const sentinel = document.createElement('div');
      sentinel.id = 'infinite-scroll-sentinel';
      document.querySelector('#job-listings-container').appendChild(sentinel);
      observer.observe(sentinel);
  },

  init() {
      // Initial load
      this.fetchJobs();
      
      // Setup infinite scroll
      this.setupInfiniteScroll();

      // Setup close button handler
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