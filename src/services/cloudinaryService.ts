import * as FileSystem from 'expo-file-system/legacy';

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.error('Missing Cloudinary configuration in .env file!');
  console.error('CLOUD_NAME:', CLOUDINARY_CLOUD_NAME ? '✓ Set' : '✗ Missing');
  console.error('UPLOAD_PRESET:', CLOUDINARY_UPLOAD_PRESET ? '✓ Set' : '✗ Missing');
}

export const cloudinaryService = {
  async uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      console.log('Reading image file...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Uploading profile picture to Cloudinary...');
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${base64}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('public_id', `chat_app/avatars/${userId}`);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Cloudinary upload error:', error);
        throw new Error(`Upload failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const avatarUrl = data.secure_url.replace(/upload\//, 'upload/w_200,h_200,c_fill,g_face/');
      console.log('Profile picture uploaded to Cloudinary:', avatarUrl);
      return avatarUrl;
    } catch (error) {
      console.error('Upload profile picture error:', error);
      throw error;
    }
  },

  async uploadImage(userId: string, imageUri: string): Promise<{
    url: string;
    publicId: string;
  }> {
    try {
      console.log('Reading image file for chat...');
      
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('Uploading image to Cloudinary...');
      const formData = new FormData();
      formData.append('file', `data:image/jpeg;base64,${base64}`);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', `chat_app/messages/${userId}`);
      formData.append('resource_type', 'auto');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Upload failed: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      console.log('Image uploaded to Cloudinary:', data.secure_url);

      return {
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  },

  async deleteImage(publicId: string): Promise<boolean> {
    try {
      console.warn('Note: Image deletion requires backend signature (not implemented)');
      return true;
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  },
};
