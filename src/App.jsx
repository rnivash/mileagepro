import { useEffect, useMemo, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'mileagepro-cycles-v2';

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createVehicle = (name = 'My Vehicle') => ({
  id: uid(),
  name,
  mileageBook: null,
  lastMileageBook: null,
});

const createMileageBook = (startReading) => ({
  id: uid(),
  status: 'open',
  startReading,
  endReading: null,
  fills: [],
});

const parsePositive = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getMileageBookTotals = (mileageBook) => {
  const totalLiters = mileageBook.fills.reduce(
    (sum, fill) => sum + (fill.liters ?? fill.litres ?? 0),
    0
  );
  const distance =
    mileageBook.endReading && mileageBook.startReading
      ? mileageBook.endReading - mileageBook.startReading
      : null;
  return {
    totalLiters,
    distance,
    mileage: distance && totalLiters > 0 ? distance / totalLiters : null,
  };
};

const normalizeVehicle = (vehicle) => ({
  id: vehicle?.id ?? uid(),
  name:
    typeof vehicle?.name === 'string' && vehicle.name.trim()
      ? vehicle.name
      : 'My Vehicle',
  mileageBook: vehicle?.mileageBook ?? null,
  lastMileageBook: vehicle?.lastMileageBook ?? null,
});

const wizardState = {
  StartMeterReading: 1,
  FuelFills: 2,
  FuelFillEdit: 2.1,
  EndMeterReading: 3,
  EndMeterReadingEdit: 3.1,
};

function VehicleStrip({
  vehicles,
  activeVehicle,
  setActiveVehicleId,
  setGlobalError,
  removeVehicle,
  setShowAddVehicle,
  showAddVehicle,
}) {
  return (
    <section className="vehicle-strip panel" aria-label="Vehicle list">
      {vehicles.map((vehicle) => (
        <div className="vehicle-chip-wrap" key={vehicle.id}>
          <button
            className={`vehicle-chip ${
              vehicle.id === activeVehicle?.id ? 'active' : ''
            }`}
            type="button"
            onClick={() => {
              setActiveVehicleId(vehicle.id);
              setGlobalError('');
            }}
          >
            {vehicle.name}
          </button>
          <button
            className="delete-chip"
            type="button"
            onClick={() => removeVehicle(vehicle.id)}
            aria-label={`Remove ${vehicle.name}`}
          >
            X
          </button>
        </div>
      ))}
      <button
        type="button"
        className="add-vehicle-button"
        onClick={() => {
          setShowAddVehicle((v) => !v);
          setGlobalError('');
        }}
        aria-label="Add new vehicle"
      >
        <svg width="24" height="24" aria-hidden="true">
          {!showAddVehicle ? (
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}
          <line
            x1="5"
            y1="12"
            x2="19"
            y2="12"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </section>
  );
}

function AddVehiclePanel({ vehicleName, setVehicleName, addVehicle }) {
  return (
    <section className="panel add-vehicle-panel">
      <h3 style={{ margin: '0 0 0.75rem 0' }}>Add vehicle</h3>
      <form onSubmit={addVehicle} className="inline-form">
        <div className="field">
          <label htmlFor="vehicle-name">Vehicle name</label>
          <input
            id="vehicle-name"
            type="text"
            placeholder="Ex: Honda City"
            value={vehicleName}
            onChange={(event) => setVehicleName(event.target.value)}
          />
        </div>
        <button type="submit">Add vehicle</button>
      </form>
    </section>
  );
}

function HowItWorksPanel({ completionChips }) {
  return (
    <>
      <div className="instructions-header">
        <h2>How it works</h2>
      </div>
      <section className="steps panel">
        {completionChips.map((step) => (
          <div key={step.label} className="step-card">
            <span>{step.label}</span>
            <p>{step.description}</p>
          </div>
        ))}
      </section>
    </>
  );
}

function SummaryPanel({
  activeVehicle,
  latestClosedMileageBookTotals,
  activeMileageBookTotals,
}) {
  return (
    <article className="panel summary-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Active vehicle</p>
          <h2>{activeVehicle?.name ?? 'No vehicle selected'}</h2>
        </div>
      </div>

      <div className="metric-grid">
        <div>
          <p className="metric-label">Mileage</p>
          <p className="metric-value">
            {activeMileageBookTotals?.mileage
              ? activeMileageBookTotals.mileage.toFixed(2)
              : latestClosedMileageBookTotals
              ? latestClosedMileageBookTotals?.mileage?.toFixed(2)
              : '0.00'}{' '}
            kmpl
          </p>
        </div>
        <div>
          <p className="metric-label">Distance</p>
          <p className="metric-value">
            {activeMileageBookTotals?.mileage
              ? activeMileageBookTotals.distance.toFixed(1)
              : latestClosedMileageBookTotals
              ? latestClosedMileageBookTotals?.distance?.toFixed(1)
              : '0.0'}
            km
          </p>
        </div>
        <div>
          <p className="metric-label">Fuel</p>
          <p className="metric-value">
            {activeMileageBookTotals?.mileage
              ? activeMileageBookTotals.totalLiters.toFixed(2)
              : latestClosedMileageBookTotals
              ? latestClosedMileageBookTotals?.totalLiters?.toFixed(2)
              : '0.00'}
            liters
          </p>
        </div>
      </div>
    </article>
  );
}

function StartSection({
  mileageBook,
  startMileageBook,
  startReading,
  setStartReading,
  wizardStep,
}) {
  return wizardStep === wizardState.StartMeterReading ? (
    <form onSubmit={startMileageBook} className="stack-form">
      <div className="field">
        <label htmlFor="start-reading">Start meter reading (km)</label>
        <input
          id="start-reading"
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={startReading}
          onChange={(event) => setStartReading(event.target.value)}
          placeholder="Ex: 15432"
        />
      </div>
      <button type="submit">Save start reading</button>
    </form>
  ) : (
    <div className="callout in-progress-callout">
      Point 1 saved at {mileageBook?.startReading?.toFixed(1)} km. Add fuel
      fills anytime until the tank reaches near empty again.
    </div>
  );
}

function FuelSection({
  activeMileageBookTotals,
  addFill,
  fillLiters,
  setFillLiters,
  setWizardStep,
  wizardStep,
}) {
  if (wizardStep < wizardState.FuelFills) return null;

  return (
    <div className="stack-form">
      <p className="section-label">Point 2</p>
      {wizardStep >= wizardState.FuelFillEdit ? (
        <button
          type="button"
          className="callout in-progress-callout callout-button"
          onClick={() => setWizardStep(wizardState.FuelFills)}
        >
          You filled tank -{' '}
          {(activeMileageBookTotals?.totalLiters ?? 0).toFixed(2)} liters so
          far. Tap to edit fuel fills.
        </button>
      ) : (
        <form onSubmit={addFill} className="stack-form">
          <div className="field">
            <label htmlFor="fill-liters">Fuel filled (liters)</label>
            <input
              id="fill-liters"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={fillLiters}
              onChange={(event) => setFillLiters(event.target.value)}
              placeholder="Ex: 18.5"
            />
          </div>
          <button type="submit">Add fuel fill</button>
        </form>
      )}
    </div>
  );
}

function EndSection({
  closeMileageBook,
  endReading,
  hasSavedEndReading,
  mileageBook,
  saveEndReading,
  setEndReading,
  setWizardStep,
  wizardStep,
}) {
  if (wizardStep < wizardState.EndMeterReading) return null;

  return (
    <div className="stack-form">
      <p className="section-label">Point 3</p>
      {wizardStep >= wizardState.EndMeterReadingEdit ? (
        <button
          type="button"
          className="callout in-progress-callout callout-button"
          onClick={() => setWizardStep(wizardState.EndMeterReading)}
        >
          Saved end reading: {mileageBook?.endReading?.toFixed(1)} km. Tap to
          edit and save again.
        </button>
      ) : (
        <>
          <div className="field">
            <label htmlFor="end-reading">End meter reading (km)</label>
            <input
              id="end-reading"
              autoComplete="off"
              type="number"
              min="0.1"
              step="0.1"
              inputMode="decimal"
              value={endReading}
              onChange={(event) => setEndReading(event.target.value)}
              placeholder="Ex: 16120"
            />
          </div>
          <button type="button" onClick={saveEndReading}>
            Save end meter reading
          </button>
        </>
      )}

      {hasSavedEndReading ? (
        <button type="button" onClick={closeMileageBook}>
          Close MileageBook
        </button>
      ) : null}
    </div>
  );
}

function FloatingError({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="floating-error" role="alert" aria-live="assertive">
      <div className="floating-error-inner">
        <span>{message}</span>
        <button
          type="button"
          className="floating-error-close"
          onClick={onClose}
          aria-label="Close error"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function App() {
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicles, setVehicles] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [createVehicle()];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [createVehicle()];
      }
      return parsed.map(normalizeVehicle);
    } catch {
      return [createVehicle()];
    }
  });

  const [activeVehicleId, setActiveVehicleId] = useState(
    () => vehicles[0]?.id ?? null
  );
  const [vehicleName, setVehicleName] = useState('');
  const [startReading, setStartReading] = useState('');
  const [fillLiters, setFillLiters] = useState('');
  const [endReading, setEndReading] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [wizardStep, setWizardStep] = useState(wizardState.StartMeterReading);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    if (!activeVehicleId && vehicles.length > 0) {
      setActiveVehicleId(vehicles[0].id);
    }
  }, [activeVehicleId, vehicles]);

  useEffect(() => {
    setStartReading('');
  }, [activeVehicleId]);

  const activeVehicle = useMemo(
    () =>
      vehicles.find((vehicle) => vehicle.id === activeVehicleId) ??
      vehicles[0] ??
      null,
    [activeVehicleId, vehicles]
  );
  const hasMileageBookEntries = Boolean(activeVehicle?.mileageBook);
  const mileageBook = activeVehicle?.mileageBook ?? null;
  const hasSavedEndReading = Number.isFinite(mileageBook?.endReading);
  const activeMileageBookTotals = mileageBook
    ? getMileageBookTotals(mileageBook)
    : null;
  const latestClosedMileageBookTotals = activeVehicle?.lastMileageBook
    ? getMileageBookTotals(activeVehicle.lastMileageBook)
    : null;

  useEffect(() => {
    if (mileageBook?.status === 'open') return;
    if (!activeVehicle?.lastMileageBook?.endReading) return;
    setStartReading(String(activeVehicle.lastMileageBook.endReading));
  }, [mileageBook?.status, activeVehicle?.lastMileageBook?.endReading]);

  useEffect(() => {
    if (!mileageBook || mileageBook.status === 'closed') {
      setWizardStep(wizardState.StartMeterReading);
      return;
    }

    if (!mileageBook.fills.length) {
      setWizardStep(wizardState.FuelFills);
      return;
    }

    if (!mileageBook.endReading) {
      setWizardStep(wizardState.EndMeterReading);
      return;
    }

    setWizardStep(wizardState.EndMeterReadingEdit);
  }, [mileageBook?.status, mileageBook?.fills.length, mileageBook?.endReading]);

  const addVehicle = (event) => {
    event.preventDefault();
    const trimmedName = vehicleName.trim();
    if (!trimmedName) {
      setGlobalError('Vehicle name is required.');
      return;
    }

    const nextVehicle = createVehicle(trimmedName);
    setVehicles((current) => [...current, nextVehicle]);
    setActiveVehicleId(nextVehicle.id);
    setVehicleName('');
    setShowAddVehicle(false);
    setGlobalError('');
  };

  const removeVehicle = (vehicleId) => {
    if (vehicles.length === 1) {
      setGlobalError('At least one vehicle is required.');
      return;
    }

    const remaining = vehicles.filter((vehicle) => vehicle.id !== vehicleId);
    setVehicles(remaining);
    if (activeVehicleId === vehicleId) {
      setActiveVehicleId(remaining[0]?.id ?? null);
    }
    setGlobalError('');
  };

  const startMileageBook = (event) => {
    event.preventDefault();
    if (!activeVehicle) return;
    const reading = parsePositive(startReading);
    if (reading === null) {
      setGlobalError('Enter a valid starting meter reading greater than zero.');
      return;
    }

    const mileageBook = createMileageBook(reading);
    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id ? { ...vehicle, mileageBook } : vehicle
      )
    );
    setGlobalError('');
  };

  const addFill = (event) => {
    event.preventDefault();
    if (!activeVehicle || !mileageBook) return;

    const liters = parsePositive(fillLiters);
    if (!liters) {
      setGlobalError('Enter a valid fuel quantity greater than zero.');
      return;
    }

    const fill = {
      id: uid(),
      liters,
      date: new Date().toISOString(),
    };

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? {
              ...vehicle,
              mileageBook: {
                ...vehicle.mileageBook,
                fills: [...vehicle.mileageBook.fills, fill],
              },
            }
          : vehicle
      )
    );
    setFillLiters('');
    setGlobalError('');
    setWizardStep(wizardState.EndMeterReading);
  };

  const saveEndReading = (event) => {
    event.preventDefault();
    if (!activeVehicle || !mileageBook) return;

    const reading = parsePositive(endReading);
    if (!reading) {
      setGlobalError('Enter a valid ending meter reading.');
      return;
    }

    if (reading <= mileageBook.startReading) {
      setGlobalError(
        'Ending reading must be greater than the starting reading.'
      );
      return;
    }

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? {
              ...vehicle,
              mileageBook: {
                ...vehicle.mileageBook,
                endReading: reading,
              },
            }
          : vehicle
      )
    );
    setGlobalError('');
    setWizardStep(wizardState.EndMeterReadingEdit);
  };

  const closeMileageBook = (event) => {
    event.preventDefault();

    if (!activeVehicle || !mileageBook) return;
    if (!mileageBook.fills.length) {
      setGlobalError(
        'Add at least one fuel fill before closing the MileageBook.'
      );
      return;
    }

    const savedReading = parsePositive(mileageBook.endReading);
    if (!savedReading) {
      setGlobalError(
        'Save the end meter reading first before closing the MileageBook.'
      );
      return;
    }

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? {
              ...vehicle,
              mileageBook: {
                ...vehicle.mileageBook,
                status: 'closed',
                endReading: savedReading,
              },
              lastMileageBook: {
                ...vehicle.mileageBook,
                status: 'closed',
                endReading: savedReading,
              },
            }
          : vehicle
      )
    );
    setEndReading('');
    setGlobalError('');
    setWizardStep(wizardState.StartMeterReading);
  };

  const completionChips = [
    {
      label: '1. Start reading',
      description: 'Record the meter when the tank is near empty.',
    },
    {
      label: '2. Fuel fills',
      description: 'Add every fuel fill between start and end.',
    },
    {
      label: '3. End reading',
      description: 'Record the next near-empty meter and calculate mileage.',
    },
  ];

  return (
    <main className="app-shell">
      <header className="hero-card">
        <p
          className="section-label"
          style={{ marginBottom: '0.4rem', textAlign: 'center' }}
        >
          Smart mileage tracker
        </p>
        <h1 style={{ margin: 0, textAlign: 'center' }}>Mileage Guru</h1>
        <p style={{ margin: '0.5rem 0 0', textAlign: 'center' }}>
          Track fuel fills, distance, and mileage across all your vehicles in
          one place.
        </p>
      </header>

      <VehicleStrip
        vehicles={vehicles}
        activeVehicle={activeVehicle}
        setActiveVehicleId={setActiveVehicleId}
        setGlobalError={setGlobalError}
        removeVehicle={removeVehicle}
        setShowAddVehicle={setShowAddVehicle}
        showAddVehicle={showAddVehicle}
      />

      {showAddVehicle && (
        <AddVehiclePanel
          vehicleName={vehicleName}
          setVehicleName={setVehicleName}
          addVehicle={addVehicle}
        />
      )}

      {!hasMileageBookEntries ? (
        <HowItWorksPanel completionChips={completionChips} />
      ) : (
        <SummaryPanel
          activeVehicle={activeVehicle}
          latestClosedMileageBookTotals={latestClosedMileageBookTotals}
          activeMileageBookTotals={activeMileageBookTotals}
        />
      )}

      <section className="grid">
        <article className="panel form-panel">
          <div className="panel-heading">
            <p className="section-label">Point 1</p>
          </div>

          <StartSection
            mileageBook={mileageBook}
            startMileageBook={startMileageBook}
            startReading={startReading}
            setStartReading={setStartReading}
            wizardStep={wizardStep}
          />

          <FuelSection
            activeMileageBookTotals={activeMileageBookTotals}
            addFill={addFill}
            fillLiters={fillLiters}
            setFillLiters={setFillLiters}
            setWizardStep={setWizardStep}
            wizardStep={wizardStep}
          />

          <EndSection
            closeMileageBook={closeMileageBook}
            endReading={endReading}
            hasSavedEndReading={hasSavedEndReading}
            mileageBook={mileageBook}
            saveEndReading={saveEndReading}
            setEndReading={setEndReading}
            setWizardStep={setWizardStep}
            wizardStep={wizardStep}
          />
        </article>
      </section>
      <FloatingError message={globalError} onClose={() => setGlobalError('')} />
    </main>
  );
}

export default App;
