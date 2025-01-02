// src/profile/work-functions.js
  
  // Retrieve the user's work experiences from Supabase
  async function getWorkExperiences(userId) {
    const { data, error } = await supabase
      .from('work_experience')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error retrieving work experiences:', error);
      return [];
    }

    return data;
  }

  // Create a new work experience in Supabase
  async function createWorkExperience(userId, experienceData) {
    const { data, error } = await supabase
      .from('work_experience')
      .insert({ ...experienceData, user_id: userId })
      .single();

    if (error) {
      console.error('Error creating work experience:', error);
      return null;
    }

    return data;
  }

  // Update a work experience in Supabase
  async function updateWorkExperience(experienceId, experienceData) {
    const { data, error } = await supabase
      .from('work_experience')
      .update(experienceData)
      .eq('id', experienceId);

    if (error) {
      console.error('Error updating work experience:', error);
      return false;
    }

    return true;
  }

  // Delete a work experience from Supabase
  async function deleteWorkExperience(experienceId) {
    const { data, error } = await supabase
      .from('work_experience')
      .delete()
      .eq('id', experienceId);

    if (error) {
      console.error('Error deleting work experience:', error);
      return false;
    }

    return true;
  }

  // Generate a unique ID for new work_experience entries
  function generateWorkExperienceId() {
    return 'work_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }

  // Populate work experiences
async function populateWorkExperiences() {
  try {
    const userId = await getUserId();

    if (userId) {
      const workExperiences = await getWorkExperiences(userId);
      const workContainer = document.getElementById('work_container');
      workContainer.innerHTML = ''; // Clear the container

      const workTemplate = document.getElementById('work-template');

      workExperiences.forEach((experience) => {
        const newWorkItem = workTemplate.content.cloneNode(true);
        const workItem = newWorkItem.querySelector('.work-item');
        workItem.dataset.id = experience.id;

        newWorkItem.querySelector('.work-company').value = experience.work_company || '';
        newWorkItem.querySelector('.work-role').value = experience.work_role || '';
        newWorkItem.querySelector('.work-location').value = experience.work_location || '';
        newWorkItem.querySelector('.work-typeofemployment').value = experience.work_typeofemployment || '';
        newWorkItem.querySelector('.work-details').value = experience.work_details || '';
        newWorkItem.querySelector('.work-currently-employed').checked = experience.work_currently_employed || false;
        newWorkItem.querySelector('.work-start-date').value = formatDate(experience.work_start_date);
        newWorkItem.querySelector('.work-end-date').value = formatDate(experience.work_end_date);

        workContainer.appendChild(newWorkItem);
      });
    } else {
      console.log('User not authenticated');
    }
  } catch (error) {
    console.error('Error populating work experiences:', error);
  }
}


  // Format date as 'MM/DD/YYYY' and return Unix timestamp
  function formatDate(date) {
    if (!date) return '';

    let parsedDate;

    try {
      if (typeof date === 'string' && date.includes('/')) {
        const [month, day, year] = date.split('/');
        parsedDate = new Date(year, month - 1, day);
      } else if (typeof date === 'number') {
        // Assuming received as Unix seconds from Supabase
        parsedDate = new Date(date * 1000);
      } else {
        return ''; // Default to empty if the format is neither
      }
    } catch (error) {
      console.error('Date Parse Error:', error);
      return '';
    }

    const formattedDate = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
    return formattedDate;
  }

// Save work experiences
async function saveWorkExperiences(userId) {
  const workItems = document.querySelectorAll('.work-item');
  const workExperiences = [];

  for (const workItem of workItems) {
    const experienceId = workItem.dataset.id;

    const experienceData = {
      work_company: workItem.querySelector('.work-company').value || '',
      work_role: workItem.querySelector('.work-role').value || '',
      work_location: workItem.querySelector('.work-location').value || '',
      work_typeofemployment: workItem.querySelector('.work-typeofemployment').value || '',
      work_details: workItem.querySelector('.work-details').value || '',
      work_currently_employed: workItem.querySelector('.work-currently-employed').checked || false,
      work_start_date: formatDateForSaving(workItem.querySelector('.work-start-date').value),
      work_end_date: formatDateForSaving(workItem.querySelector('.work-end-date').value)
    };

    if (Object.values(experienceData).some(value => value !== null && value !== '')) {
      workExperiences.push({ ...experienceData, id: experienceId });
    }
  }

  const existingExperiences = await getWorkExperiences(userId);
  for (const existingExperience of existingExperiences) {
    if (!workExperiences.some(exp => exp.id === existingExperience.id)) {
      await deleteWorkExperience(existingExperience.id);
    }
  }

  for (const experienceData of workExperiences) {
    const existingExperience = existingExperiences.find(exp => exp.id === experienceData.id);
    if (existingExperience) {
      await updateWorkExperience(existingExperience.id, experienceData);
    } else {
      await createWorkExperience(userId, experienceData);
    }
  }
}
  function formatDateForSaving(dateString) {
    if (!dateString) return null;

    const [month, day, year] = dateString.split('/');
    const dateObj = new Date(year, month - 1, day);
    return Math.floor(dateObj.getTime() / 1000);
  }



  // Attach event listeners when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  populateWorkExperiences();

  // Event delegation for dynamically added elements
  document.addEventListener('click', async (event) => {
    // Event handling for adding new work experience
    if (event.target.id === 'work_add') {
      event.preventDefault();
      const workContainer = document.getElementById('work_container');
      const newWorkId = generateWorkExperienceId();
      const workTemplate = document.getElementById('work-template');
      const newWorkItem = workTemplate.content.cloneNode(true);
      const workItem = newWorkItem.querySelector('.work-item');
      workItem.dataset.id = newWorkId;
      workContainer.appendChild(newWorkItem);
    }

    // Event handling for removing a work experience
    else if (event.target.classList.contains('remove-instance-btn')) {
      event.preventDefault();
      const workItem = event.target.closest('.work-item');
      if (workItem) {
        const workItemId = workItem.dataset.id;
        const userId = await getUserId();
        await deleteWorkExperience(workItemId);
        workItem.remove();
      }
    }
  });
});
