import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Eye, ArrowLeftRight, Calendar, Plus, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PhotoUpload } from "./PhotoUpload";

interface ProgressPhoto {
  id: string;
  imageUrl: string;
  date: string;
  milestone: string;
  note?: string;
  category: 'before' | 'progress' | 'milestone';
}

// Mock progress photos - in real app these would be user uploads
const mockPhotos: ProgressPhoto[] = [
  {
    id: '1',
    imageUrl: '/placeholder.svg',
    date: '2024-01-01',
    milestone: 'Starting Journey',
    note: 'Day 1 - Ready to make a change!',
    category: 'before'
  },
  {
    id: '2',
    imageUrl: '/placeholder.svg',
    date: '2024-01-07',
    milestone: '1 Week Progress',
    note: 'First week completed! Feeling stronger already.',
    category: 'progress'
  },
  {
    id: '3',
    imageUrl: '/placeholder.svg',
    date: '2024-01-15',
    milestone: '2 Week Milestone',
    note: 'Two weeks smoke-free and working out consistently!',
    category: 'milestone'
  }
];

const categoryStyles = {
  before: { label: 'Before', color: 'bg-muted/10 text-muted-foreground' },
  progress: { label: 'Progress', color: 'bg-secondary/10 text-secondary' },
  milestone: { label: 'Milestone', color: 'bg-success/10 text-success' }
};

export const PhotosPage = () => {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<[string?, string?]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (user) {
      loadPhotos();
    }
  }, [user]);

  const loadPhotos = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await (supabase as any)
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      
      setPhotos(data?.map((photo: any) => ({
        id: photo.id,
        imageUrl: photo.image_url,
        date: photo.date,
        milestone: photo.milestone,
        note: photo.note,
        category: photo.category
      })) || []);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  };

  const selectPhotoForComparison = (photoId: string) => {
    if (selectedPhotos[0] === photoId) {
      setSelectedPhotos([selectedPhotos[1]]);
    } else if (selectedPhotos[1] === photoId) {
      setSelectedPhotos([selectedPhotos[0]]);
    } else if (!selectedPhotos[0]) {
      setSelectedPhotos([photoId]);
    } else if (!selectedPhotos[1]) {
      setSelectedPhotos([selectedPhotos[0], photoId]);
    } else {
      setSelectedPhotos([photoId]);
    }
  };

  const canCompare = selectedPhotos.filter(Boolean).length === 2;

  return (
    <div className="p-4 pb-24 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold mb-2">Progress Photos</h1>
        <p className="text-muted-foreground">Visual journey of your transformation</p>
      </div>

      {/* Stats Card */}
      <Card className="gradient-primary text-white shadow-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm opacity-90">Photos Captured</p>
                <p className="text-xl font-bold">{photos.length}</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {photos.length > 0 ? 'Growing!' : 'Start now'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="shadow-card border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Privacy Protected</h4>
              <p className="text-xs text-muted-foreground">
                Your photos are stored securely and only visible to you. Enable local storage for offline access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Upload */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-success" />
            Add Progress Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showUpload ? (
            <PhotoUpload 
              onPhotoAdded={loadPhotos}
              onClose={() => setShowUpload(false)}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => setShowUpload(true)}
                  className="h-12 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button 
                  onClick={() => setShowUpload(true)}
                  variant="gradient" 
                  className="h-12"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Document your progress with regular photos to see your transformation over time.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comparison Mode */}
      {photos.length >= 2 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-secondary" />
                Compare Photos
              </div>
              {canCompare && (
                <Button 
                  onClick={() => setShowComparison(!showComparison)}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showComparison ? 'Hide' : 'View'} Comparison
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showComparison && canCompare ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {selectedPhotos.filter(Boolean).map((photoId, index) => {
                    const photo = photos.find(p => p.id === photoId);
                    if (!photo) return null;
                    return (
                      <div key={photoId} className="space-y-2">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={photo.imageUrl} 
                            alt={photo.milestone}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{photo.milestone}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(photo.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center p-3 bg-success/5 rounded-lg">
                  <p className="text-sm text-success font-medium">
                    Amazing progress! Keep up the great work! 🎉
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                {photos.length < 2 
                  ? "Take at least 2 photos to enable comparison"
                  : canCompare 
                    ? "Click 'View Comparison' to see side-by-side photos"
                    : "Select 2 photos from the timeline below to compare"
                }
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Photos Timeline */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Photo Timeline</h3>
        
        {photos.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No photos yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start your visual journey by taking your first progress photo. Seeing your transformation over time is incredibly motivating!
              </p>
              <Button className="gradient-primary shadow-primary text-white">
                <Camera className="h-4 w-4 mr-2" />
                Take First Photo
              </Button>
            </CardContent>
          </Card>
        ) : (
          photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((photo) => (
            <Card 
              key={photo.id} 
              className={`shadow-card transition-all duration-200 cursor-pointer ${
                selectedPhotos.includes(photo.id) ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => selectPhotoForComparison(photo.id)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={photo.imageUrl} 
                      alt={photo.milestone}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm">{photo.milestone}</h4>
                      <Badge className={categoryStyles[photo.category].color}>
                        {categoryStyles[photo.category].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(photo.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    {photo.note && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {photo.note}
                      </p>
                    )}
                    {selectedPhotos.includes(photo.id) && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs border-primary text-primary">
                          Selected for comparison
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Photo Tips */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Photo Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">For best results:</h4>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4">
              <li>• Take photos in the same lighting and angle</li>
              <li>• Wear similar clothing for consistent comparison</li>
              <li>• Take photos at the same time of day</li>
              <li>• Include face and full body when possible</li>
              <li>• Add notes about how you're feeling</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};