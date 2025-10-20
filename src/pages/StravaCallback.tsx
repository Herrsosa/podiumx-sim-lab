import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StravaCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/my-athlete/overview', { replace: true });
  }, [navigate]);

  return null;
}
