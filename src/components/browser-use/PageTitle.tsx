
import { useEffect } from 'react';

interface PageTitleProps {
  title: string;
}

export const PageTitle: React.FC<PageTitleProps> = ({ title }) => {
  useEffect(() => {
    // Update the document title
    const previousTitle = document.title;
    document.title = title;
    
    // Restore the previous title when component unmounts
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  // This component doesn't render anything visible
  return null;
};
