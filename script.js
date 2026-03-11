'use strict';

// CL
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    //   (this.date = ...)
    // (this.id = ...)
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// CL
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // METH
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// CL
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type = 'cycling';
    this.calcSpeed();
    this._setDescription();
  }

  // METH
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 5.7, 95, 523);
// console.log(run1, cycling1);

/////////////////////////////////////////////////////////////////////
// CL APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const workoutsContainer = document.querySelector('.workouts');
const deleteAllWortkoutBtn = document.querySelector('.delete--icon');
const inputKey = document.querySelector('.sort__input--key');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #markers = {};
  #editId;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Press Esc to close the form
    form.addEventListener('keydown', this._escCloseForm.bind(this));

    // Edit workout
    workoutsContainer.addEventListener('click', this._editForm.bind(this));

    // Delete workout
    workoutsContainer.addEventListener('click', this._deleteWorkout.bind(this));

    //Delete all workout
    deleteAllWortkoutBtn.addEventListener(
      'click',
      this._deleteAllWorkout.bind(this),
    );

    // Sort workout
    inputKey.addEventListener('change', this._sortWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        },
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    //   const { longitude } = position.coords;
    console.log(
      `https://www.google.com/maps/@${latitude},${longitude},3996m/data=!3m1!1e3?entry=ttu&g_ep=EgoyMDI2MDMwMi4wIKXMDSoASAFQAw%3D%3D`,
    );

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _resetInput() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    this._resetInput();
  }

  _editForm(e) {
    // Check event is edit
    const target = e.target;
    if (!target.classList.contains('workout__edit--icon')) return;

    // Init
    this.#editId = target.closest('.workout')?.dataset.id;
    const workout = this.#workouts.find(work => work.id === this.#editId);
    const type = workout.type;

    // Show form
    form.classList.remove('hidden');
    inputDistance.focus();

    // Init input
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    if (type !== inputType.value) {
      inputType.value = type;
      if (type === 'running') {
        // Change form-row
        inputCadence
          .closest('.form__row')
          .classList.remove('form__row--hidden');
        inputElevation.closest('.form__row').classList.add('form__row--hidden');
      }
      if (type === 'cycling') {
        // Change form-row
        inputCadence.closest('.form__row').classList.add('form__row--hidden');
        inputElevation
          .closest('.form__row')
          .classList.remove('form__row--hidden');
      }
    }
    if (type === 'running') {
      // Change input
      inputCadence.value = workout.cadence;
      return;
    }
    if (type === 'cycling') {
      // Change input
      inputElevation.value = workout.elevationGain;
    }
  }

  _hideForm() {
    //  Empty inputs
    this._resetInput();

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1);
  }

  _escCloseForm(e) {
    if (e.key !== 'Escape') return;
    this._hideForm();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // _validInputs(...inputs) {
  //   return inputs.every(inp => Number.isFinite(inp));
  // }
  // _allPositive(...inputs) {
  //   return inputs.every(inp => inp > 0);
  // }

  _validInputs(type, ...inputs) {
    inputs.forEach((inp, i) => {
      if (!Number.isFinite(inp)) {
        alert(
          `${i === 0 ? 'Distance' : i === 1 ? 'Duration' : type === 'running' ? 'Cadence' : 'Elevation gain'} inputs have to be  numbers!`,
        );
        return false;
      }
    });
    return true;
  }

  _allPositive(...inputs) {
    inputs.forEach((inp, i) => {
      if (inp <= 0) {
        alert(
          `${i === 0 ? 'Distance' : i === 1 ? 'Duration' : 'Cadence'} inputs have to be positive numbers!`,
        );
        return false;
      }
    });
    return true;
  }

  _newWorkout(e) {
    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const existingWorkout = this.#workouts.find(
      work => work.id === this.#editId,
    );
    let lat, lng;
    if (this.#mapEvent) {
      ({ lat, lng } = this.#mapEvent.latlng);
    } else if (existingWorkout?.coords) {
      lat = existingWorkout?.coords[0];
      lng = existingWorkout?.coords[1];
    }
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !this._validInputs(type, distance, duration, cadence) ||
        !this._allPositive(distance, duration, cadence)
      )
        return;

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !this._validInputs(type, distance, duration, elevation) ||
        !this._allPositive(distance, duration)
      )
        return;

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    this._editWorkout();

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    // Display marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _editWorkout() {
    // Check edit mode
    if (this.#editId) this._deleteWorkoutById();

    this.#editId = undefined;
  }

  _deleteWorkout(e) {
    const target = e.target;
    if (!target.classList.contains('workout__trash--icon')) return;

    setTimeout(() => {
      // Ask user to confirm deletion
      const confirmed = confirm(
        'Are you sure you want to delete this workout?',
      );
      if (!confirmed) return;

      // Delete workout of #workouts
      const id = target.closest('.workout').dataset.id;
      this.#workouts = this.#workouts.filter(work => id !== work.id);

      // Update localStrage
      this._setLocalStorage();

      // Delete workout list
      this._unrenderWorkout(id);

      // Delete marker
      this._unrenderWorkoutMarker(id);
    }, 595);
  }

  _deleteWorkoutById() {
    // Delete workout of #workouts
    this.#workouts = this.#workouts.filter(work => this.#editId !== work.id);

    // Update localStrage
    this._setLocalStorage();

    // Delete workout list
    this._unrenderWorkout(this.#editId);

    // Delete marker
    this._unrenderWorkoutMarker(this.#editId);
  }

  _deleteAllWorkout() {
    // Check if #workouts is empty
    if (!this.#workouts.length) return;

    // Ask user to confirm deletion
    const confirmed = confirm('Are you sure you want to delete all workout?');
    if (!confirmed) return;

    // Delete　all workout of #workouts
    this.#workouts = [];

    // Delete　localStorage
    localStorage.removeItem('workouts');

    // Delete workouts list
    containerWorkouts
      .querySelectorAll('.workout')
      .forEach(work => work.remove());

    // Delete all markger
    Object.values(this.#markers).forEach(marker => marker.remove());
    this.#markers = {};
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }),
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`,
      )
      .openPopup();

    this.#markers[workout.id] = marker;
  }

  _unrenderWorkoutMarker(id) {
    this.#markers[id]?.remove();
    delete this.#markers[id];
  }

  _renderWorkout(workout) {
    const type = workout.type;
    const html = `
     <li class="workout workout--${type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <img class="workout__edit--icon" src="./assets/images/edit_icon.PNG" title="Edit"  /> 
          </div>
          <div class="workout__details">
            <img class="workout__trash--icon" src="./assets/images/trash_icon.PNG" title="Delete"/> 
          </div>
          <div class="workout__details">
            <span class="workout__icon">${type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value value__distance">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value value__duration">${workout.duration} </span>
            <span class="workout__unit">min</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value value__paceSpeed">${type === 'running' ? workout.pace.toFixed(1) : workout.speed.toFixed(1)}</span>
            <span class="workout__unit">${type === 'running' ? 'min' : 'km/h'}</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${type === 'running' ? '🦶🏼' : '⛰'}</span>
            <span class="workout__value value__cadeElev">${type === 'running' ? workout.cadence : workout.elevationGain}</span>
            <span class="workout__unit">${type === 'running' ? 'spm' : 'm'}</span>
          </div>
        </li>
          `;

    form.insertAdjacentHTML('afterend', html);
  }

  _unrenderWorkout(id) {
    workoutsContainer.querySelector(`.workout[data-id="${id}"]`)?.remove();
  }

  _sortWorkout(e) {
    const value = e.target.value;

    // Delete workout list
    this.#workouts.forEach(work => this._unrenderWorkout(work.id));

    // Sort workout & update list
    if (value === 'distance') {
      const newWorkout = this.#workouts.toSorted(
        (a, b) => a.distance - b.distance,
      );
      newWorkout.forEach(work => this._renderWorkout(work));
    } else if (value === 'duration') {
      const newWorkout = this.#workouts.toSorted(
        (a, b) => a.duration - b.duration,
      );
      newWorkout.forEach(work => this._renderWorkout(work));
    } else if (value === 'date') {
      this.#workouts.forEach(work => this._renderWorkout(work));
    }
  }

  _moveToPopup(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id,
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 0.6,
      },
    });

    // using the public interface
    workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const storedWorkouts = JSON.parse(localStorage.getItem('workouts'));

    if (!storedWorkouts) return;

    // Create an instance from localStorage
    this.#workouts = storedWorkouts.map(work => {
      let newWorkout;
      if (work.type === 'running') {
        newWorkout = new Running(
          work.coords,
          work.distance,
          work.duration,
          work.cadence,
        );
      } else if (work.type === 'cycling') {
        newWorkout = new Cycling(
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain,
        );
      } else return;
      newWorkout.date = work.date;
      newWorkout.id = work.id;
      newWorkout.clicks = work.clicks;
      return newWorkout;
    });

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// 10 additional feature ideas: challenges
// 1.✓ Ability to edit a workout
// 2.✓ Ability to delete a workout
// 3.✓ Ability to delete all workouts
// 4.✓ Ability to sort workouts by a certain field(e.g. distance)
// 5.✓ Re-build Running and Cycling objects coming from Local Storage
// 6.✓ More realistic error and confirmation messages

// 7. Ability to position the map to show all workouts
// 8. Ability to draw lines and shapes instead of just points

// 9. Geocode location from coordinates ("Run in Faro, Portugal")
// 10. Display weather data for workout time and place
