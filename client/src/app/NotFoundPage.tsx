import { Link } from 'react-router-dom';
import { commonContent } from '../content/common';

export function NotFoundPage() {
  return (
    <section className="card">
      <h1>{commonContent.notFound.title}</h1>
      <p>
        <Link to="/">{commonContent.notFound.back}</Link>
      </p>
    </section>
  );
}
