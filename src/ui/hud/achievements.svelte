<script lang="ts">
  import { onDestroy } from 'svelte';
  import { derived } from 'svelte/store';
  import Check from '../components/check.svelte';
  import completed, { Achievement } from '../stores/achievements';

  const Achievements = [
    {
      id: Achievement.inventory,
      name: 'Open the Inventory',
      help: [
        'Press [I] to open the Inventory.',
        'There\'s a few basic items already in there.',
        'Should be enough to start a factory.',
        'You can also manually craft some items in there',
        'if you have the necessary ingredients.',
      ],
    },
    {
      id: Achievement.scanner,
      name: 'Use the Resource Scanner',
      help: [
        'Press [X] to use the Resource Scanner.',
        'It will search for nearby resource nodes and',
        'populate your compass with their location.',
      ],
    },
    {
      id: Achievement.deposit,
      name: 'Find a Deposit',
      help: [
        'Resource deposits are scattered around the world.',
        'Go explore and look for stone-ish blobs on the ground.',
        'When you find one, survey it by holding the cursor over it.',
      ],
    },
    {
      id: Achievement.build,
      name: 'Open the Build menu',
      help: [
        'Press [Q] to open the Build menu.',
        'Clicking on a blueprint will select it for building.',
        'Pressing the number keys while holding the cursor',
        'over a blueprint will add it the hotbar.',
      ],
    },
    {
      id: Achievement.miner,
      name: 'Build a Miner',
      help: [
        'Miners can only be placed on top of Deposits.',
        'Select the Miner from the Build menu [Q] and',
        'Click over a Deposit to place it on top.',
        'The Miner yield will depend on the deposit purity.',
      ],
    },
    {
      id: Achievement.turbine,
      name: 'Build a Wind Turbine',
      help: [
        'Miners and many other machines require power.',
        'Select the Wind Turbine from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
      ],
    },
    {
      id: Achievement.power,
      name: 'Power the Miner',
      help: [
        'Select the Wire from the Build menu [Q] and',
        'Click over the Wind Turbine, and then',
        'Click over the Miner to wire them together.',
      ],
    },
    {
      id: Achievement.beacon,
      name: 'Place a Beacon',
      help: [
        'Select the Beacon from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
        '',
        'Beacons are always visible on your Compass to locate',
        'parts of your factory and other points of interest.',
      ],
    },
    {
      id: Achievement.smelter,
      name: 'Smelting',
      help: [
        'Select the Smelter from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
        '',
        'Right Click over the Smelter (or press [E] while looking at it)',
        'and select the Ingot corresponding to the Ore in the Miner.',
        '',
        'Remember to wire the Smelter so it gets powered.',
      ],
    },
    {
      id: Achievement.fabricator,
      name: 'Manufacturing',
      help: [
        'Select the Fabricator from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
        '',
        'Right Click over the Fabricator (or press [E] while looking at it)',
        'and select an item for production.',
        '',
        'Remember to wire the Fabricator so it gets powered.',
      ],
    },
    {
      id: Achievement.research,
      name: 'Complete a Research',
      help: [
        'Select the Lab from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
        '',
        'Right Click over the Lab (or press [E] while looking at it)',
        'and select a research.',
        '',
        'Remember to wire the Lab so it gets powered.',
      ],
    },
  ];
  const current = derived([completed], ([$completed]) => Achievements.find((achievement) => !$completed.has(achievement.id)));
  let achievement: (typeof Achievements[0] & { completed: boolean; }) | undefined;
  let timer: number;
  const unsubscribe = current.subscribe((next) => {
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
    }, 10000);
  });
  onDestroy(() => {
    unsubscribe();
    clearTimeout(timer);
  });
</script>

{#if achievement}
  <div class="achievement" class:completed={achievement.completed}>
    <div class="heading">
      <Check checked={achievement.completed} />
      <div>{achievement.name}</div>
    </div>
    <div class="help">
      {#each achievement.help as line}
        <div>{line}</div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .achievement {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(0.5rem);
    border-radius: 0.5rem;
  }
  .achievement.completed {
    background: rgba(90, 255, 90, 0.3);
    color: #111;
  }
  .heading {
    display: flex;
    gap: 0.5rem;
    font-size: 1rem;
  }
  .help > div {
    min-height: 1.125rem;
  }
</style>
