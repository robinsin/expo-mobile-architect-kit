
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Grid2X2, LayoutList } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface GridViewToggleProps {
  gridView: 'single' | 'double';
  setGridView: (view: 'single' | 'double') => void;
}

const GridViewToggle: React.FC<GridViewToggleProps> = ({ gridView, setGridView }) => {
  const isMobile = useIsMobile();
  
  // Set default to single view on mobile
  useEffect(() => {
    if (isMobile && gridView !== 'single') {
      setGridView('single');
    }
  }, [isMobile, gridView, setGridView]);
  
  return (
    <div className="flex justify-end mb-4">
      <div className="border rounded-md flex overflow-hidden">
        <Button 
          variant={gridView === 'single' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-none"
          onClick={() => setGridView('single')}
        >
          <LayoutList className="h-4 w-4 mr-2" />
          <span className="text-xs">Single</span>
        </Button>
        <Button 
          variant={gridView === 'double' ? 'default' : 'ghost'}
          size="sm"
          className="rounded-none"
          onClick={() => setGridView('double')}
        >
          <Grid2X2 className="h-4 w-4 mr-2" />
          <span className="text-xs">Grid</span>
        </Button>
      </div>
    </div>
  );
};

export default GridViewToggle;
