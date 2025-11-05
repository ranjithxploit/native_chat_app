import { cloudinaryService } from './cloudinaryService';

export const imageService = {
  async uploadProfilePicture(userId: string, imageUri: string): Promise<string> {
    try {
      console.log('Uploading profile picture to: ' + userId);
      const url = await cloudinaryService.uploadProfilePicture(userId, imageUri);
      console.log('Profile picture uploaded:', url);
      return url;
    } catch (error) {
      console.error('Upload profile picture error:', error);
      throw error;
    }
  },

  async uploadImage(userId: string, imageUri: string): Promise<{
    url: string;
    key: string;
  }> {
    try {
      const result = await cloudinaryService.uploadImage(userId, imageUri);
      return {
        url: result.url,
        key: result.publicId,
      };
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  },

  async deleteImage(imageKey: string) {
    try {
      return await cloudinaryService.deleteImage(imageKey);
    } catch (error) {
      console.error('Delete image error:', error);
      return false;
    }
  },

  async cleanupExpiredImages() {
    try {
      console.log('Cloudinary handles auto-deletion via upload settings');
      return true;
    } catch (error) {
      console.error('Cleanup expired images error:', error);
      return false;
    }
  },
};

export const scheduleImageCleanup = () => {
  console.log('Image cleanup scheduled (handled by Cloudinary)');
};
