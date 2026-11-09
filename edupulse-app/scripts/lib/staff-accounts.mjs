// Names retained from the project records; role/name corrections confirmed by the owner.
// App-only test logins, not verified institutional mailboxes or course assignments.
export const STAFF_ACCOUNTS = [
  { name: 'Ginard S. Guaki', surname: 'guaki', role: 'dean' },
  { name: 'Myriell Nginsayan', surname: 'nginsayan', role: 'associate_dean' },
  { name: 'Marielle Angela Fianza-Buya', surname: 'fianza-buya', role: 'instructor' },
  { name: 'Rogelio L. Guisdan', surname: 'guisdan', role: 'instructor' },
  { name: 'Dave Medrano', surname: 'medrano', role: 'instructor' },
  { name: 'Ralphy Luzada', surname: 'luzada', role: 'instructor' },
  { name: 'Steve Sudaypan', surname: 'sudaypan', role: 'instructor' },
  { name: 'Libby Teofilo', surname: 'teofilo', role: 'instructor' },
  { name: 'Sharmaine Pangcog', surname: 'pangcog', role: 'instructor' },
].map(({ surname, ...account }) => Object.freeze({ ...account, email: `${surname}@edupulse.com` }))

export const STAFF_PROJECT_URL = 'https://xyziepdkdvvuhgkymooo.supabase.co'
