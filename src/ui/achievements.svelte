<script lang="ts">
  import { derived } from 'svelte/store';
  import completed from './stores/achievements';

  const Achievements = [
    { id: 'deposit', name: 'Find a resource deposit' },
    { id: 'build', name: 'Open the build menu [Q]' },
    { id: 'miner', name: 'Build a Miner on top of the deposit' },
    { id: 'generator', name: 'Build a Generator near the Miner' },
    { id: 'power', name: 'Wire the Miner to the Generator' },
    { id: 'smelter', name: 'Smelt some Ore into Ingots' },
    { id: 'fabricator', name: 'Fabricate a Box/Cylinder' },
  ];
  const current = derived([completed], ([$completed]) => Achievements.find((achievement) => !$completed.includes(achievement.id)));
  let achievement: (typeof Achievements[0] & { completed: boolean; }) | undefined;
  let timer: number;
  current.subscribe((next) => {
    clearTimeout(timer);
    if (achievement) {
      if (achievement.id === next?.id) {
        return;
      }
      achievement = { ...achievement, completed: true };
    } else if (next) {
      achievement = { ...next, completed: false };
      return;
    }
    timer = setTimeout(() => {
      achievement = next ? { ...next, completed: false } : undefined;
    }, 3000);
  });
</script>

{#if achievement}
  <div class="achievement" class:completed={achievement.completed}>
    <div class="status">
      <svg viewBox="0 0 24 24">
        <path d="M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        {#if achievement.completed}
          <path d="M7.75 12L10.58 14.83L16.25 9.17004" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        {/if}
      </svg>
    </div>
    <div>{achievement.name}</div>
  </div>
{/if}

<style>
  .achievement {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(0.5rem);
    padding: 1rem;
    border-radius: 0.5rem;
    pointer-events: none;
    font-size: 1rem;
    gap: 0.5rem;
    z-index: 2;
    display: none;
  }

  :global(body.hotbar) .achievement, :global(body.pointerlock) .achievement {
    display: flex;
  }

  .achievement.completed {
    background: rgba(90, 255, 90, 0.5);
    color: #111; 
  }

  .status > svg {
    fill: none;
    stroke: currentColor;
    width: 1rem;
    height: 1rem;
    pointer-events: none;
  }
</style>
