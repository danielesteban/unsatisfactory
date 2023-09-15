<script lang="ts">
  import { onDestroy } from 'svelte';
  import { derived } from 'svelte/store';
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
      id: Achievement.generator,
      name: 'Build a Generator',
      help: [
        'Miners and many other machines require power.',
        'Select the Generator from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
      ],
    },
    {
      id: Achievement.power,
      name: 'Power the Miner',
      help: [
        'Select the Wire from the Build menu [Q] and',
        'Click over the Generator, and then',
        'Click over the Miner to wire them together.',
        'The use of Poles is advised since the Generator',
        'can only handle 4 simultaneous direct connections.'
      ],
    },
    {
      id: Achievement.smelter,
      name: 'Smelting',
      help: [
        'Select the Smelter from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
        '',
        'Then select the Belt (from the Build menu, again) and',
        'Click over the Miner, and then',
        'Click over the Smelter to belt them together.',
        '',
        'Finally, Right Click over the Smelter (or press [E] while looking at it)',
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
        'Then select the Belt (from the Build menu, again) and',
        'Click over the Smelter, and then',
        'Click over the Fabricator to belt them together.',
        '',
        'Finally, Right Click over the Fabricator (or press [E] while looking at it)',
        'and select an item for production.',
        '',
        'Remember to wire the Fabricator so it gets powered.',
      ],
    },
    {
      id: Achievement.points,
      name: 'Get some points',
      help: [
        'Feeding items into the Sink will give you points.',
        'Complex items yield more points than raw materials.',
        '',
        'Select the Sink from the Build menu [Q] and',
        'Click over the terrain (or a foundation) to place it on top.',
        'Then belt the output of a Smelter or Fabricator into the Sink.',
        '',
        'Remember to wire the Sink so it gets powered.',
        'You may need additonal Generators for this.',
      ],
    },
    // {
    //   id: Achievement.combinator,
    //   name: 'Advanced manufacturing',
    //   help: [
    //     'Select the Combinator from the Build menu [Q] and',
    //     'Click over the terrain (or a foundation) to place it on top.',
    //     '',
    //     'Right Click over the Combinator (or press [E] while looking at it)',
    //     'and select an item for production.',
    //     '',
    //     'You may need need to build an extra production line',
    //     'similar to the one you just built for another item.',
    //     '',
    //     'Remember to wire the Combinator so it gets powered.',
    //     'You may need additonal Generators for this.',
    //   ],
    // },
    // {
    //   id: Achievement.aggregator,
    //   name: 'Industrial manufacturing',
    //   help: [
    //     'Select the Aggregator from the Build menu [Q] and',
    //     'Click over the terrain (or a foundation) to place it on top.',
    //     '',
    //     'Right Click over the Aggregator (or press [E] while looking at it)',
    //     'and select an item for production.',
    //     '',
    //     'You may need need to build some extra production lines',
    //     'similar to the ones you just built for the Aggregator.',
    //     '',
    //     'Remember to wire the Aggregator so it gets powered.',
    //     'You may need additonal Generators for this.',
    //   ],
    // },
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
    <div class="help">
      {#each achievement.help as line}
        <div>{line}</div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .achievement {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(0.5rem);
    padding: 1rem;
    border-radius: 0.5rem;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
    display: none;
    z-index: 2;
  }

  :global(body.pointerlock) .achievement, :global(body.ui) .achievement {
    display: flex;
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

  .status > svg {
    fill: none;
    stroke: currentColor;
    width: 1rem;
    height: 1rem;
  }
</style>
