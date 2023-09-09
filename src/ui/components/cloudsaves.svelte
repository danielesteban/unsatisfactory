<script lang="ts">
  import Cloudsaves from '../stores/cloudsaves';

  enum View {
    options,
    user,
    login,
    loginError,
    register,
    registerError,
  }

  let view: View = View.options;
  const setView = (v: View) => () => {
    view = v;
  };

  $: view = $Cloudsaves ? View.user : View.options;
  
  let username: string = '';
  let password: string = '';
  let isLoading = false;
  const login = () => {
    isLoading = true;
    (view === View.login ? Cloudsaves.login(username, password) : Cloudsaves.register(username, password))
      .then(() => (
        Cloudsaves
          .load()
          .then(() => location.reload())
          .catch(() => {})
      ))
      .catch(() => {
        view = view === View.login ? View.loginError : View.registerError;
      })
      .finally(() => {
        isLoading = false;
      });
  };
  const logout = () => {
    Cloudsaves.logout();
    location.reload();
  };
</script>

<div class="cloudsaves">
  {#if $Cloudsaves && view === View.user}
    <button on:click={logout}>
      Logout
    </button>  
    <div>
      Username: {$Cloudsaves.username}
    </div>
  {:else if view === View.options}
    <button on:click={setView(View.login)}>
      Login
    </button>
    <div class="alt">or</div>
    <button on:click={setView(View.register)}>
      Create an account
    </button>
  {:else if view === View.loginError}
    <button on:click={setView(View.options)}>
      Retry
    </button>
    <div class="error">Invalid username/password combination.</div>
  {:else if view === View.registerError}
    <button on:click={setView(View.options)}>
      Retry
    </button>
    <div class="error">Username already exists.</div>
  {:else}
    <input
      type="text"
      autocomplete="username"
      placeholder="Username"
      bind:value={username}
    />
    <input
      type="password"
      autocomplete="current-password"
      placeholder="Password"
      bind:value={password}
    />
    <button disabled={isLoading} on:click={login}>
      {view === View.login ? 'Login' : 'Register'}
    </button>
  {/if}
</div>

<style>
  .cloudsaves {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .alt {
    color: #aaa;
  }
  .error {
    color: #eaa;
  }
</style>
