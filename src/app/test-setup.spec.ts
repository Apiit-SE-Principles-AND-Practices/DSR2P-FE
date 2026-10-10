// The session lives in sessionStorage, which every spec shares: start each one signed out.
beforeEach(() => {
  sessionStorage.removeItem('session');
});
