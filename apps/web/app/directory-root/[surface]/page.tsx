import { notFound } from 'next/navigation';
import Home, { generateMetadata as homeMetadata } from '@/components/directory-home';
import Categories, { metadata as categoriesMetadata } from '@/components/directory-categories';
import Browse, { metadata as browseMetadata } from '@/components/directory-browse';

// Public /, /servers and /categories rewrite here. Empty params deliberately
// defer the first render until a request; successful HTML retains hourly ISR.
export const revalidate = 3600;
export const maxDuration = 15;
export const dynamicParams = true;
export function generateStaticParams(): { surface: string }[] { return []; }
export async function generateMetadata({ params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params;
  if (surface === 'home') return homeMetadata();
  if (surface === 'categories') return categoriesMetadata;
  if (surface === 'servers') return browseMetadata;
  notFound();
}
export default async function DirectoryRoot({ params }: { params: Promise<{ surface: string }> }) {
  const { surface } = await params;
  if (surface === 'home') return Home();
  if (surface === 'categories') return Categories();
  if (surface === 'servers') return Browse();
  notFound();
}
