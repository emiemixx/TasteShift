const goalCards = document.querySelectorAll('.goal-card');
const productBox = document.getElementById('productBox');
const selectedSummary = document.getElementById('selectedSummary');

const updateSelectionSummary = () => {
  const activeGoals = [...goalCards]
    .filter((card) => card.classList.contains('is-selected'))
    .map((card) => card.dataset.label);

  selectedSummary.textContent = activeGoals.length
    ? `Wybrane cele: ${activeGoals.join(', ')}`
    : 'Jeszcze nie wybrałeś celu';
};

const toggleGoal = (card) => {
  const isSelected = card.classList.toggle('is-selected');
  card.setAttribute('aria-pressed', String(isSelected));

  if (card.dataset.goal === 'wiecej') {
    productBox.classList.toggle('hidden', !isSelected);
  }

  updateSelectionSummary();
};

goalCards.forEach((card) => {
  card.addEventListener('click', () => toggleGoal(card));
});

updateSelectionSummary();
