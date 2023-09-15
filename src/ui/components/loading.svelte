<div class="loading">
  <svg viewBox="0 0 24 24">
    <path d="M5.25589 16C3.8899 15.0291 3 13.4422 3 11.6493C3 9.20008 4.8 6.9375 7.5 6.5C8.34694 4.48637 10.3514 3 12.6893 3C15.684 3 18.1317 5.32251 18.3 8.25C19.8893 8.94488 21 10.6503 21 12.4969C21 14.0582 20.206 15.4339 19 16.2417M12 21V11M12 21L9 18M12 21L15 18" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div>
    Loading...
  </div>
</div>

<style>
  .loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    pointer-events: none;
  }

  .loading > svg {
    fill: none;
    stroke: currentColor;
    width: 1.5rem;
    height: 1.5rem;
  }

  .loading > div {
    color: #aaa;
  }
</style>
