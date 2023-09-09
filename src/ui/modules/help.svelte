<div class="help">
  <div>
    <div class="keys">
      <div>
        <div class="key">W</div>
      </div>
      <div>
        <div class="key">A</div>
        <div class="key">S</div>
        <div class="key">D</div>
      </div>
    </div>
    <div>Move</div>
  </div>
  <div>
    <div class="keys">
      <div class="key">Q</div>
    </div>
    <div>Build</div>
  </div>
  <div>
    <div class="keys">
      <div class="key">F</div>
    </div>
    <div>Dismantle</div>
  </div>
  <div>
    <div class="pointer">
      <svg viewBox="0 0 356.572 356.572">
        <path d="M181.563,0C120.762,0,59.215,30.525,59.215,88.873V237.5c0,65.658,53.412,119.071,119.071,119.071 c65.658,0,119.07-53.413,119.07-119.071V88.873C297.356,27.809,237.336,0,181.563,0z M274.945,237.5 c0,53.303-43.362,96.657-96.659,96.657c-53.299,0-96.657-43.354-96.657-96.657v-69.513c20.014,6.055,57.685,15.215,102.221,15.215 c28.515,0,59.831-3.809,91.095-14.567V237.5z M274.945,144.794c-81.683,31.233-168.353,7.716-193.316-0.364V88.873 c0-43.168,51.489-66.46,99.934-66.46c46.481,0,93.382,20.547,93.382,66.46V144.794z M190.893,48.389v81.248 c0,6.187-5.023,11.208-11.206,11.208c-6.185,0-11.207-5.021-11.207-11.208V48.389c0-6.186,5.021-11.207,11.207-11.207 C185.869,37.182,190.893,42.203,190.893,48.389z M264.272,130.378c0,0-46.687,13.072-62.566,10.271V36.988 C201.706,36.988,276.412,37.923,264.272,130.378z"></path>
      </svg>
      <div>/</div>
      <div class="key">E</div>
    </div>
    <div>Interact</div>
  </div>
  <div>
    <div class="keys">
      <div class="key">I</div>
    </div>
    <div>Inventory</div>
  </div>
  <div>
    <div class="pointer">
      <svg viewBox="0 0 356.572 356.572">
        <path d="M181.563,0C120.762,0,59.215,30.525,59.215,88.873V237.5c0,65.658,53.412,119.071,119.071,119.071 c65.658,0,119.07-53.413,119.07-119.071V88.873C297.356,27.809,237.336,0,181.563,0z M274.945,237.5 c0,53.303-43.362,96.657-96.659,96.657c-53.299,0-96.657-43.354-96.657-96.657v-69.513c20.014,6.055,57.685,15.215,102.221,15.215 c28.515,0,59.831-3.809,91.095-14.567V237.5z M274.945,144.794c-81.683,31.233-168.353,7.716-193.316-0.364V88.873 c0-43.168,51.489-66.46,99.934-66.46c46.481,0,93.382,20.547,93.382,66.46V144.794z M190.893,48.389v81.248 c0,6.187-5.023,11.208-11.206,11.208c-6.185,0-11.207-5.021-11.207-11.208V48.389c0-6.186,5.021-11.207,11.207-11.207 C185.869,37.182,190.893,42.203,190.893,48.389z"></path>
      </svg>
    </div>
    <div>Pick</div>
  </div>
  <div>
    <div class="keys">
      <div>
        <div class="key">R</div>
        <div class="key">T</div>
      </div>
    </div>
    <div>Rotate</div>
  </div>
  <div>
    <div class="keys">
      <div class="key">O</div>
    </div>
    <div>Codex</div>
  </div>
  <div>
    <div class="keys">
      <div>
        <div class="key shift">Shift</div>
      </div>
    </div>
    <div>Sprint</div>
  </div>
  <div>
    <div class="keys">
      <div>
        <div class="key spacebar">Space</div>
      </div>
    </div>
    <div>Jump</div>
  </div>
</div>

<style>
  .help {
    display: flex;
    flex-direction: column;
    padding: 1rem;
    gap: 0.5rem;
    color: #aaa;
  }
  .help > div {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
  }
  .help > div > div {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5rem;
    height: 2.75rem;
  }
  .keys, .pointer {
    color: #fff;
  }
  .keys {
    flex-direction: column;
    gap: 0.5rem;
  }
  .keys > div {
    display: flex;
    gap: 0.25rem;
  }
  .key {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border: 2px solid #fff;
    border-radius: 0.25rem;
  }
  .key.shift {
    width: 3.25rem;
  }
  .key.spacebar {
    width: 4.5rem;
  }
  .pointer {
    gap: 0.25rem;
  }
  .pointer > svg {
    fill: currentColor;
    width: 2.75rem;
    height: 2.75rem;
  }
  .pointer .key {
    margin: 0 0.5rem;
  }
</style>
