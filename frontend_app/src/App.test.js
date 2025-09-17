import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app with Dice Roller brand', () => {
  render(<App />);
  const title = screen.getByText(/Dice Roller/i);
  expect(title).toBeInTheDocument();
});
