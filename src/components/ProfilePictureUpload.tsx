import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProfilePictureUploadProps {
  currentImageUrl?: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
  size?: "sm" | "md" | "lg";
}

export const ProfilePictureUpload = ({ 
  currentImageUrl, 
  onImageUpdate, 
  size = "md" 
}: ProfilePictureUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };

  const uploadImage = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      // Delete old profile picture if it exists
      if (currentImageUrl) {
        const oldFileName = currentImageUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('profile-pictures')
            .remove([`${user.id}/${oldFileName}`]);
        }
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const publicUrl = data.publicUrl;

      // Update profile with new image URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      onImageUpdate(publicUrl);
      toast.success("Profile picture updated successfully!");

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!user || !currentImageUrl) return;

    try {
      setUploading(true);

      // Delete from storage
      const fileName = currentImageUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('profile-pictures')
          .remove([`${user.id}/${fileName}`]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      onImageUpdate(null);
      toast.success("Profile picture removed successfully!");

    } catch (error: any) {
      console.error('Error removing image:', error);
      toast.error("Failed to remove image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage 
            src={currentImageUrl || undefined} 
            alt="Profile picture" 
          />
          <AvatarFallback className="bg-muted">
            <User className={size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-8 w-8"} />
          </AvatarFallback>
        </Avatar>
        
        {size !== "sm" && (
          <>
            <div
              className={`absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${dragActive ? 'opacity-100 bg-primary/20' : ''}`}
              onDrop={handleDrop}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onClick={() => document.getElementById('profile-picture-input')?.click()}
            >
              <Camera className="h-4 w-4 text-white" />
            </div>
            
            {currentImageUrl && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                onClick={removeImage}
                disabled={uploading}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {size !== "sm" && (
        <>
          <Input
            id="profile-picture-input"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
          
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Click, drag & drop, or select an image
            </p>
            <p className="text-xs text-muted-foreground">
              Max 5MB • JPG, PNG, GIF
            </p>
          </div>
        </>
      )}
    </div>
  );
};