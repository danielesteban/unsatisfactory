<script lang="ts">
  import Cloudsaves from '../stores/cloudsaves';

  let username: string = '';
  let password: string = '';
  let isLoading = false;
  const login = () => {
    isLoading = true;
    Cloudsaves
      .login(username, password)
      .then(() => (
        Cloudsaves
          .load()
          .then(() => location.reload())
          .catch(() => {})
      ))
      .catch(() => {
        // @dani @incomplete
        // Display login error
      })
      .finally(() => {
        isLoading = false;
      });
  };
</script>

<div class="cloudsaves">
  {#if $Cloudsaves}
    <button on:click={Cloudsaves.logout}>
      Logout
    </button>  
    <div>
      Username: {$Cloudsaves.username}
    </div>
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
      Login
    </button>
  {/if}
</div>

<style>
  .cloudsaves {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .cloudsaves > input {
    flex-shrink: 1;
  }
</style>
