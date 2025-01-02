// src/profile/utils.js
export function formatDate(date) {
    if (!date) return '';

    let parsedDate;

    try {
        if (typeof date === 'string' && date.includes('/')) {
            const [month, day, year] = date.split('/');
            parsedDate = new Date(year, month - 1, day);
        } else if (typeof date === 'number') {
            parsedDate = new Date(date * 1000);
        } else {
            return '';
        }
    } catch (error) {
        console.error('Date Parse Error:', error);
        return '';
    }

    const formattedDate = `${parsedDate.getMonth() + 1}/${parsedDate.getDate()}/${parsedDate.getFullYear()}`;
    return formattedDate;
}

export function formatDateForSaving(dateString) {
    if (!dateString) return null;

    const [month, day, year] = dateString.split('/');
    const dateObj = new Date(year, month - 1, day);
    return Math.floor(dateObj.getTime() / 1000);
}