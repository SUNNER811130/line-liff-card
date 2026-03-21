import { render, screen } from '@testing-library/react';
import { App } from '../App';

describe('App', () => {
  it('renders three action buttons', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: '加入 LINE' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '官方網站' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '預約洽詢' })).toBeInTheDocument();
  });

  it('renders in web-preview mode without LIFF_ID', () => {
    render(<App />);
    expect(screen.getByText('web-preview')).toBeInTheDocument();
  });
});
