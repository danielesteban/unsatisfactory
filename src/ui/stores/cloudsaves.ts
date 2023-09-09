import { writable } from 'svelte/store';

const server = 'https://unsatisfactory-cloudsaves.gatunes.com/';
// const server = 'http://localhost:8081/';

type User = {
  username: string;
  session: string;
};

let user: User | undefined;

const key = 'cloudsaves:session';
const stored = localStorage.getItem(key);
try {
  if (stored) {
    user = JSON.parse(stored);
  }
} catch (e) {}

const { subscribe, set } = writable<User | undefined>(user);

const setUser = (u: User | undefined) => {
  set(user = u);
  if (u) {
    localStorage.setItem(key, JSON.stringify(u));
  } else {
    localStorage.removeItem(key);
  }
};

const request = (method: string, endpoint: string, body?: FormData | string) => (
  fetch(`${server}${endpoint}`, {
    body,
    headers: {
      ...(user ? { 'Authorization': `Bearer ${user.session}` } : {}),
      ...(body && !(body instanceof FormData) ? { 'Content-type': 'application/json' } : {}),
    },
    method,
  })
    .then((res) => {
      if (res.status < 200 || res.status >= 400) {
        throw new Error();
      }
      if (res.headers.get('content-type')?.indexOf('application/json') === 0) {
        return res.json();
      } else {
        return res.text();
      }
    })
);

if (user) {
  request('GET', 'user')
    .then(setUser)
    .catch(() => setUser(undefined));
}

export default {
  subscribe,
  isEnabled: () => !!user,
  load: () => {
    if (!user) {
      throw new Error();
    }
    return request('GET', 'save');
  },
  save: (serialized: string) => {
    if (!user) {
      throw new Error();
    }
    const body = new FormData();
    body.append('file', new Blob([serialized], { type: 'application/json' }));
    return request('PUT', 'save', body);
  },
  reset: () => {
    if (!user) {
      throw new Error();
    }
    return request('DELETE', 'save');
  },
  login: (username: string, password: string) => (
    request('PUT', 'user', JSON.stringify({ username, password }))
      .then(setUser)
  ),
  logout: () => (
    setUser(undefined)
  ),
  register: (username: string, password: string) => (
    request('POST', 'user', JSON.stringify({ username, password }))
      .then(setUser)
  ),
};
