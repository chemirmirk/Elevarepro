import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface PhotoUploadProps {
  onPhotoAdded: () => void;
  onClose: () => void;
}

export const PhotoUpload = ({ onPhotoAdded, onClose }: PhotoUploadProps) => {
  const { user } = useAuth();
  const [milestone, setMilestone] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<'before' | 'progress' | 'milestone'>('progress');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !milestone.trim() || !user) {
      toast.error("Please fill in all required fields and select a photo");
      return;
    }

    try {
      setIsUploading(true);

      // Create a unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage (we'll need to create the bucket first)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error("Failed to upload photo");
        return;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('progress-photos')
        .getPublicUrl(fileName);

      // Save photo record to database 
      const { error: dbError } = await (supabase as any)
        .from('progress_photos')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          milestone,
          note: note.trim() || null,
          category,
          date: new Date().toISOString().split('T')[0]
        });

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error("Failed to save photo record");
        return;
      }

      toast.success("Photo uploaded successfully!");
      onPhotoAdded();
      onClose();
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Add Progress Photo
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="photo-upload">Photo</Label>
          <div className="flex items-center gap-2">
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="white"
              onClick={() => document.getElementById('photo-upload')?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {selectedFile ? 'Change Photo' : 'Select Photo'}
            </Button>
          </div>
          {previewUrl && (
            <div className="mt-2">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Milestone */}
        <div className="space-y-2">
          <Label htmlFor="milestone">Milestone Title *</Label>
          <Input
            id="milestone"
            placeholder="e.g., 1 Week Progress, Starting Point..."
            value={milestone}
            onChange={(e) => setMilestone(e.target.value)}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(value: any) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="before">Before</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note">Note (Optional)</Label>
          <Textarea
            id="note"
            placeholder="How are you feeling? What's changed since your last photo?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[80px] resize-none"
          />
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || !milestone.trim() || isUploading}
          className="w-full gradient-primary shadow-primary text-white"
        >
          {isUploading ? "Uploading..." : "Save Photo"}
        </Button>
      </CardContent>
    </Card>
  );
};