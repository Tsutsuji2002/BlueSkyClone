const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const uploadImage = async (file: File, folder: string = 'chat'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/media/upload?folder=${folder}`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
};
