// src/profile/edu-functions.js


import { getUserId } from '../auth.js';
import { formatDate, formatDateForSaving } from './utils.js';

export async function getEducationExperiences(userId) {
  const { data, error } = await window.supabase
    .from('education_experience')
    .select('*')
    .eq('user_id', userId)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error retrieving education experiences:', error);
    return [];
  }
  return data;
}

export async function createEducationExperience(userId, experienceData) {
  const { data, error } = await window.supabase
    .from('education_experience')
    .insert({ ...experienceData, user_id: userId })
    .single();

  if (error) {
    console.error('Error creating education experience:', error);
    return null;
  }
  return data;
}

export async function updateEducationExperience(experienceId, experienceData) {
  const { data, error } = await window.supabase
    .from('education_experience')
    .update(experienceData)
    .eq('id', experienceId);

  if (error) {
    console.error('Error updating education experience:', error);
    return false;
  }
  return true;
}

export async function deleteEducationExperience(experienceId) {
  const { data, error } = await window.supabase
    .from('education_experience')
    .delete()
    .eq('id', experienceId);

  if (error) {
    console.error('Error deleting education experience:', error);
    return false;
  }
  return true;
}

export function generateEducationExperienceId() {
  return 'edu_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export async function populateEducationExperiences() {
  try {
    const userId = await getUserId();

    if (userId) {
      const educationExperiences = await getEducationExperiences(userId);
      const eduContainer = document.getElementById('edu_container');
      eduContainer.innerHTML = ''; // Clear the container

      const eduTemplate = document.getElementById('edu-template');

      educationExperiences.forEach((experience) => {
        const newEduItem = eduTemplate.content.cloneNode(true);
        const eduItem = newEduItem.querySelector('.edu-item');
        eduItem.dataset.id = experience.id;

        newEduItem.querySelector('.edu-school').value = experience.edu_school || '';
        newEduItem.querySelector('.edu-degree').value = experience.edu_degree || '';
        newEduItem.querySelector('.edu-major').value = experience.edu_major || '';
        newEduItem.querySelector('.edu-location').value = experience.edu_location || '';
        newEduItem.querySelector('.edu-gpa').value = experience.edu_gpa || '';
        newEduItem.querySelector('.edu-details').value = experience.edu_details || '';
        newEduItem.querySelector('.edu-graduated').checked = experience.edu_graduated || false;
        newEduItem.querySelector('.edu-start-date').value = formatDate(experience.edu_startdate);
        newEduItem.querySelector('.edu-end-date').value = formatDate(experience.edu_enddate);

        eduContainer.appendChild(newEduItem);
      });
    } else {
      console.log('User not authenticated');
    }
  } catch (error) {
    console.error('Error populating education experiences:', error);
  }
}

export async function saveEducationExperiences(userId) {
  const eduItems = document.querySelectorAll('.edu-item');
  const educationExperiences = [];

  for (const eduItem of eduItems) {
    const experienceId = eduItem.dataset.id;

    const experienceData = {
      edu_school: eduItem.querySelector('.edu-school').value || '',
      edu_degree: eduItem.querySelector('.edu-degree').value || '',
      edu_major: eduItem.querySelector('.edu-major').value || '',
      edu_location: eduItem.querySelector('.edu-location').value || '',
      edu_gpa: parseFloat(eduItem.querySelector('.edu-gpa').value) || null,
      edu_details: eduItem.querySelector('.edu-details').value || '',
      edu_graduated: eduItem.querySelector('.edu-graduated').checked || false,
      edu_startdate: formatDateForSaving(eduItem.querySelector('.edu-start-date').value),
      edu_enddate: formatDateForSaving(eduItem.querySelector('.edu-end-date').value)
    };

    if (Object.values(experienceData).some(value => value !== null && value !== '')) {
      educationExperiences.push({ ...experienceData, id: experienceId });
    }
  }

  const existingExperiences = await getEducationExperiences(userId);
  for (const existingExperience of existingExperiences) {
    if (!educationExperiences.some(exp => exp.id === existingExperience.id)) {
      await deleteEducationExperience(existingExperience.id);
    }
  }

  for (const experienceData of educationExperiences) {
    const existingExperience = existingExperiences.find(exp => exp.id === experienceData.id);
    if (existingExperience) {
      await updateEducationExperience(existingExperience.id, experienceData);
    } else {
      await createEducationExperience(userId, experienceData);
    }
  }
}