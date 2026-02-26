export async function fetchInfrastructure(city?: string) {
  const url = city
    ? `http://localhost:4000/api/infrastructure?city=${encodeURIComponent(city)}`
    : `http://localhost:4000/api/infrastructure`;

  const res = await fetch(url);
  return res.json();
}