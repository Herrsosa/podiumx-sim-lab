import { useMediaQuery } from 'react-responsive';

export const useMobile = () => {
  return useMediaQuery({ query: '(max-width: 767px)' });
};