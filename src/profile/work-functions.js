// webflow_js/src/profile/work-functions.js
  
import { getUserId } from '../auth.js';
import { formatDate, formatDateForSaving } from './utils.js';

export async function getWorkExperiences(userId) {
  const { data, error } = await window.supabase
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

export async function createWorkExperience(userId, experienceData) {
  const { data, error } = await window.supabase
    .from('work_experience')
    .insert({ ...experienceData, user_id: userId })
    .single();

  if (error) {
    console.error('Error creating work experience:', error);
    return null;
  }

  return data;
}

export async function updateWorkExperience(experienceId, experienceData) {
  const { data, error } = await window.supabase
    .from('work_experience')
    .update(experienceData)
    .eq('id', experienceId);

  if (error) {
    console.error('Error updating work experience:', error);
    return false;
  }

  return true;
}

export async function deleteWorkExperience(experienceId) {
  const { data, error } = await window.supabase
    .from('work_experience')
    .delete()
    .eq('id', experienceId);

  if (error) {
    console.error('Error deleting work experience:', error);
    return false;
  }

  return true;
}

export function generateWorkExperienceId() {
  return 'work_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export async function populateWorkExperiences() {
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

export async function saveWorkExperiences(userId) {
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