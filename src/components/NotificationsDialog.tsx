import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageSquare, User, Clock, Bell } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Notification, Profile } from "@/types/social";
import { fetchProfiles, fetchNotifications, markNotificationAsRead } from "@/utils/databaseUtils";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const NotificationsDialog: React.FC<NotificationsDialogProps> = ({
  open,
  onOpenChange,
  userId
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open && userId) {
      loadNotifications();
    }
  }, [open, userId]);
  
  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications
      const notificationsData = await fetchNotifications(userId);
      setNotifications(notificationsData);
      
      // Fetch profile data for actors
      const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
      if (actorIds.length > 0) {
        const profilesData = await fetchProfiles(actorIds);
        setProfiles(profilesData);
      }
      
      // Mark notifications as read
      const unreadNotifications = notificationsData.filter(n => !n.read);
      if (unreadNotifications.length > 0) {
        await Promise.all(
          unreadNotifications.map(n => markNotificationAsRead(n.id))
        );
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    // Navigate to relevant content or profile
    if (notification.type === 'follow') {
      navigate(`/artist/${notification.actor_id}`);
    } else if (notification.content_id && notification.content_type) {
      navigate(`/search?highlight=${notification.content_id}`);
    }
    
    onOpenChange(false);
  };
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'follow':
        return <User className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  const getNotificationText = (notification: Notification) => {
    const actorName = profiles[notification.actor_id]?.name || 'Someone';
    
    switch (notification.type) {
      case 'like':
        return `${actorName} liked your ${notification.content_type}`;
      case 'comment':
        return `${actorName} commented on your ${notification.content_type}`;
      case 'follow':
        return `${actorName} started following you`;
      default:
        return `New notification from ${actorName}`;
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  const formatNotificationTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // If it's today, show relative time (e.g., "2 hours ago")
    if (date.toDateString() === now.toDateString()) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // Otherwise, show the date
    return format(date, 'MMM d, yyyy');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] overflow-y-auto pr-3">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-3 py-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    flex items-start gap-3 p-3 rounded-md cursor-pointer
                    ${notification.read ? 'bg-background' : 'bg-muted/50'}
                    hover:bg-muted transition-colors
                  `}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <Avatar className="h-10 w-10">
                    {profiles[notification.actor_id]?.avatar_url ? (
                      <AvatarImage src={profiles[notification.actor_id].avatar_url || ''} />
                    ) : (
                      <AvatarFallback>
                        {profiles[notification.actor_id]?.name 
                          ? getInitials(profiles[notification.actor_id].name) 
                          : 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getNotificationIcon(notification.type)}
                        <span className="text-sm font-medium ml-1">
                          {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at)}
                      </span>
                    </div>
                    
                    <p className="text-sm mt-1">{getNotificationText(notification)}</p>
                    
                    {!notification.read && (
                      <Badge variant="outline" className="mt-1 bg-primary/10">New</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          )}
        </ScrollArea>
        
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
