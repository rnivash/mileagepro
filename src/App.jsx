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
  cycles: [],
});

const createCycle = (startReading) => ({
  id: uid(),
  status: 'open',
  startReading,
  startAt: new Date().toISOString(),
  endReading: null,
  endAt: null,
  fills: [],
});

// Accept zero if allowed (for first meter reading)
const parseNonNegative = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parsePositive = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const safeNumber = (value) => (Number.isFinite(value) ? value : 0);

const formatDateTime = (value) => new Date(value).toLocaleString();

const formatMoney = (value) => `₹${value.toFixed(2)}`;

const getCycleTotals = (cycle) => {
  const totalLitres = cycle.fills.reduce((sum, fill) => sum + fill.litres, 0);
  const totalCost = cycle.fills.reduce((sum, fill) => sum + fill.price, 0);
  const hasEnded = cycle.status === 'closed' && cycle.endReading !== null;
  const distance = hasEnded ? cycle.endReading - cycle.startReading : null;
  const mileage = hasEnded && totalLitres > 0 ? distance / totalLitres : null;
  const averagePricePerLitre = totalLitres > 0 ? totalCost / totalLitres : null;

  return {
    totalLitres,
    totalCost,
    distance,
    mileage,
    averagePricePerLitre,
    fillCount: cycle.fills.length,
    hasEnded,
  };
};

const getVehicleSummary = (vehicle) => {
  const completedCycles = vehicle.cycles.filter(
    (cycle) => cycle.status === 'closed'
  );
  const openCycle =
    vehicle.cycles.find((cycle) => cycle.status === 'open') ?? null;

  const totals = completedCycles.reduce(
    (accumulator, cycle) => {
      const cycleTotals = getCycleTotals(cycle);
      accumulator.distance += safeNumber(cycleTotals.distance);
      accumulator.litres += cycleTotals.totalLitres;
      accumulator.cost += cycleTotals.totalCost;
      return accumulator;
    },
    { distance: 0, litres: 0, cost: 0 }
  );

  return {
    completedCycles,
    openCycle,
    completedCount: completedCycles.length,
    totalDistance: totals.distance,
    totalLitres: totals.litres,
    totalCost: totals.cost,
    lifetimeMileage: totals.litres > 0 ? totals.distance / totals.litres : null,
  };
};

const panelTitleButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  flex: 1,
  padding: 0,
};

function SummaryPanel({
  activeVehicle,
  activeCycle,
  hasLastMileage,
  hasLastDistance,
  hasLastFuel,
  latestClosedCycleTotals,
  vehicleSummary,
}) {
  return (
    <article className="panel summary-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Active vehicle</p>
          <h2>{activeVehicle?.name ?? 'No vehicle selected'}</h2>
        </div>
        <span className={`status-pill ${activeCycle ? 'live' : 'idle'}`}>
          {activeCycle ? 'Cycle in progress' : 'Ready to start'}
        </span>
      </div>

      <div className="metric-grid">
        <div>
          <p className="metric-label">Last mileage</p>
          <p className="metric-value">
            {hasLastMileage
              ? `${latestClosedCycleTotals.mileage.toFixed(2)} km/l`
              : 'Not enough data'}
          </p>
        </div>
        <div>
          <p className="metric-label">Last distance</p>
          <p className="metric-value">
            {hasLastDistance
              ? `${latestClosedCycleTotals.distance.toFixed(1)} km`
              : 'Not enough data'}
          </p>
        </div>
        <div>
          <p className="metric-label">Last fuel</p>
          <p className="metric-value">
            {hasLastFuel
              ? `${latestClosedCycleTotals.totalLitres.toFixed(2)} l`
              : 'Not enough data'}
          </p>
        </div>
        <div>
          <p className="metric-label">Lifetime mileage</p>
          <p className="metric-value">
            {vehicleSummary?.lifetimeMileage
              ? `${vehicleSummary.lifetimeMileage.toFixed(2)} km/l`
              : 'Not enough data'}
          </p>
        </div>
        <div>
          <p className="metric-label">Total distance</p>
          <p className="metric-value">
            {vehicleSummary?.totalDistance.toFixed(1) ?? '0.0'} km
          </p>
        </div>
        <div>
          <p className="metric-label">Total fuel</p>
          <p className="metric-value">
            {vehicleSummary?.totalLitres.toFixed(2) ?? '0.00'} l
          </p>
        </div>
        <div>
          <p className="metric-label">Total spend</p>
          <p className="metric-value">
            {formatMoney(vehicleSummary?.totalCost ?? 0)}
          </p>
        </div>
      </div>
    </article>
  );
}

function PetrolPricePanel({
  petrolPricePanelCollapsed,
  setPetrolPricePanelCollapsed,
  blockNumberScroll,
  blockNumberStepKeys,
  petrolPrice,
  setPetrolPrice,
}) {
  return (
    <section className="panel petrol-price-panel">
      <div className="panel-heading" style={{ marginBottom: 0 }}>
        <button
          type="button"
          style={panelTitleButtonStyle}
          onClick={() => setPetrolPricePanelCollapsed((v) => !v)}
        >
          <p className="section-label">Fuel settings</p>
          <h2 style={{ margin: 0 }}>Petrol price</h2>
          {petrolPricePanelCollapsed && parsePositive(petrolPrice) ? (
            <p className="field-note" style={{ marginTop: '0.25rem' }}>
              Current: {formatMoney(parsePositive(petrolPrice))}/litre
            </p>
          ) : null}
        </button>
      </div>
      {!petrolPricePanelCollapsed ? (
        <form
          onSubmit={(e) => e.preventDefault()}
          className="stack-form"
          style={{ marginTop: '1rem' }}
        >
          <div className="field">
            <label htmlFor="petrol-price">Petrol price (₹/litre)</label>
            <input
              id="petrol-price"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              onWheelCapture={blockNumberScroll}
              onKeyDown={blockNumberStepKeys}
              value={petrolPrice}
              onChange={(e) => setPetrolPrice(e.target.value)}
              placeholder="Ex: 105.50"
            />
            <p className="field-note">Required before adding fuel fills</p>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function HistoryPanel({
  completedCycles,
  selectedClosedCycle,
  selectedClosedCycleIndex,
  selectedClosedCycleTotals,
  deleteSelectedCycle,
  goToPreviousCycle,
  goToNextCycle,
}) {
  return (
    <article className="panel history-panel">
      <div className="panel-heading">
        <div style={panelTitleButtonStyle}>
          <p className="section-label">History</p>
          <h2 style={{ margin: 0 }}>Closed cycles</h2>
        </div>
        <span className="status-pill subtle">
          {completedCycles.length} records
        </span>
      </div>

      {selectedClosedCycle ? (
        <div className="history-focus card-focus">
          <div className="history-focus-head">
            <div>
              <p className="section-label">Viewing</p>
              <h3>
                Cycle {selectedClosedCycleIndex + 1} of {completedCycles.length}
              </h3>
            </div>
            <div className="history-nav">
              <button
                type="button"
                className="nav-button danger"
                onClick={deleteSelectedCycle}
                aria-label="Delete cycle"
                style={{ padding: '0.4rem' }}
              >
                X
              </button>
            </div>
          </div>

          <div className="history-timeline featured">
            <div>
              <span className="event-badge start">Point 1</span>
              <p>{formatDateTime(selectedClosedCycle.startAt)}</p>
              <p>{selectedClosedCycle.startReading.toFixed(1)} km</p>
            </div>
            <div className="event-middle">
              <span className="event-badge fill">Fuel fills</span>
              <p>{selectedClosedCycleTotals?.fillCount ?? 0} fill(s)</p>
              <p>
                {selectedClosedCycleTotals?.totalLitres.toFixed(2) ?? '0.00'} l
                • {formatMoney(selectedClosedCycleTotals?.totalCost ?? 0)}
              </p>
            </div>
            <div>
              <span className="event-badge end">Point 3</span>
              <p>{formatDateTime(selectedClosedCycle.endAt)}</p>
              <p>{selectedClosedCycle.endReading?.toFixed(1)} km</p>
            </div>
          </div>

          <div className="history-result selected-result">
            <div>
              <span className="metric-label">Distance</span>
              <strong>
                {selectedClosedCycleTotals?.distance?.toFixed(1)} km
              </strong>
            </div>
            <div>
              <span className="metric-label">Mileage</span>
              <strong>
                {selectedClosedCycleTotals?.mileage?.toFixed(2)} km/l
              </strong>
            </div>
            <div>
              <span className="metric-label">Fuel cost per litre</span>
              <strong>
                {selectedClosedCycleTotals?.averagePricePerLitre
                  ? formatMoney(selectedClosedCycleTotals.averagePricePerLitre)
                  : '—'}
              </strong>
            </div>
          </div>

          <div className="history-bottom-nav">
            <button
              type="button"
              className="nav-button"
              onClick={goToPreviousCycle}
              disabled={selectedClosedCycleIndex <= 0}
              aria-label="Previous cycle"
              style={{ padding: '0.4rem' }}
            >
              <svg
                width="24"
                height="24"
                aria-hidden="true"
                style={{ verticalAlign: 'middle' }}
              >
                <polyline
                  points="15 18 9 12 15 6"
                  fill="none"
                  stroke="#08060d"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="nav-button"
              onClick={goToNextCycle}
              disabled={
                selectedClosedCycleIndex < 0 ||
                selectedClosedCycleIndex >= completedCycles.length - 1
              }
              aria-label="Next cycle"
              style={{ padding: '0.4rem' }}
            >
              <svg
                width="24"
                height="24"
                aria-hidden="true"
                style={{ verticalAlign: 'middle' }}
              >
                <polyline
                  points="9 6 15 12 9 18"
                  fill="none"
                  stroke="#08060d"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {completedCycles.length > 1 ? (
        <p className="empty-state history-hint">
          {completedCycles.length} closed cycle(s) available. Use Previous and
          Next to browse them one at a time.
        </p>
      ) : (
        <p className="empty-state">
          Closed mileage cycles will appear here after point 3 is saved.
        </p>
      )}
    </article>
  );
}

function App() {
  // Collapsible add vehicle form
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  // Centralized petrol price
  const [petrolPrice, setPetrolPrice] = useState(() => {
    try {
      const val = localStorage.getItem('mileagepro-petrol-price');
      return val ? String(val) : '';
    } catch {
      return '';
    }
  });
  const [vehicles, setVehicles] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [createVehicle()];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return [createVehicle()];
      }
      return parsed;
    } catch {
      return [createVehicle()];
    }
  });

  const [activeVehicleId, setActiveVehicleId] = useState(
    () => vehicles[0]?.id ?? null
  );
  const [vehicleName, setVehicleName] = useState('');
  const [startReading, setStartReading] = useState('');
  const [fillLitres, setFillLitres] = useState('');
  const [endReading, setEndReading] = useState('');
  const [petrolPricePanelCollapsed, setPetrolPricePanelCollapsed] = useState(
    () => {
      try {
        return Boolean(localStorage.getItem('mileagepro-petrol-price'));
      } catch {
        return false;
      }
    }
  );
  const [selectedClosedCycleId, setSelectedClosedCycleId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    if (petrolPrice !== '') {
      localStorage.setItem('mileagepro-petrol-price', petrolPrice);
    }
  }, [petrolPrice]);

  useEffect(() => {
    if (petrolPrice === '') {
      setPetrolPricePanelCollapsed(false);
    }
  }, [petrolPrice]);

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
  const hasCycleEntries = (activeVehicle?.cycles.length ?? 0) > 0;

  const vehicleSummary = useMemo(
    () => (activeVehicle ? getVehicleSummary(activeVehicle) : null),
    [activeVehicle]
  );

  const activeCycle = vehicleSummary?.openCycle ?? null;
  const activeFillCount = activeCycle?.fills.length ?? 0;
  const activeCycleTotals = activeCycle ? getCycleTotals(activeCycle) : null;
  const canShowApproxMileage =
    Boolean(activeCycle) &&
    activeCycle?.status !== 'closed' &&
    Number.isFinite(activeCycle?.endReading) &&
    Number.isFinite(activeCycle?.startReading) &&
    (activeCycleTotals?.totalLitres ?? 0) > 0 &&
    activeCycle.endReading > activeCycle.startReading;
  const approximateMileage = canShowApproxMileage
    ? (activeCycle.endReading - activeCycle.startReading) /
      activeCycleTotals.totalLitres
    : null;
  const completedCycles = vehicleSummary?.completedCycles ?? [];

  useEffect(() => {
    if (completedCycles.length === 0) {
      setSelectedClosedCycleId(null);
      return;
    }

    const stillExists = completedCycles.some(
      (cycle) => cycle.id === selectedClosedCycleId
    );
    if (!stillExists) {
      setSelectedClosedCycleId(completedCycles.at(-1)?.id ?? null);
    }
  }, [completedCycles, selectedClosedCycleId]);

  const selectedClosedCycle =
    completedCycles.find((cycle) => cycle.id === selectedClosedCycleId) ??
    completedCycles.at(-1) ??
    null;
  const selectedClosedCycleIndex = selectedClosedCycle
    ? completedCycles.findIndex((cycle) => cycle.id === selectedClosedCycle.id)
    : -1;
  const selectedClosedCycleTotals = selectedClosedCycle
    ? getCycleTotals(selectedClosedCycle)
    : null;
  const latestClosedCycle = completedCycles.at(-1) ?? null;
  const latestClosedCycleTotals = latestClosedCycle
    ? getCycleTotals(latestClosedCycle)
    : null;
  const hasLastMileage = Number.isFinite(latestClosedCycleTotals?.mileage);
  const hasLastDistance = Number.isFinite(latestClosedCycleTotals?.distance);
  const hasLastFuel = Number.isFinite(latestClosedCycleTotals?.totalLitres);
  const petrolPriceValue = parsePositive(petrolPrice);
  const fillLitresValue = parsePositive(fillLitres);

  useEffect(() => {
    if (activeCycle) return;
    if (!latestClosedCycle?.endReading) return;
    if (startReading) return;
    setStartReading(String(latestClosedCycle.endReading));
  }, [activeCycle, latestClosedCycle, startReading]);

  useEffect(() => {
    if (!activeCycle) {
      return;
    }
  }, [activeCycle?.id]);

  useEffect(() => {
    if (!activeCycle) {
      setEndReading('');
      return;
    }

    setEndReading(activeCycle.endReading ? String(activeCycle.endReading) : '');
  }, [activeCycle?.id, activeCycle?.endReading]);

  const goToPreviousCycle = () => {
    if (selectedClosedCycleIndex > 0) {
      setSelectedClosedCycleId(
        completedCycles[selectedClosedCycleIndex - 1].id
      );
    }
  };

  const goToNextCycle = () => {
    if (
      selectedClosedCycleIndex >= 0 &&
      selectedClosedCycleIndex < completedCycles.length - 1
    ) {
      setSelectedClosedCycleId(
        completedCycles[selectedClosedCycleIndex + 1].id
      );
    }
  };

  const blockNumberScroll = (event) => {
    event.preventDefault();
    event.currentTarget.blur();
  };

  const blockNumberStepKeys = (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
    }
  };

  const deleteSelectedCycle = () => {
    if (!selectedClosedCycle || !activeVehicle) return;

    const nextCycles = activeVehicle.cycles.filter(
      (cycle) => cycle.id !== selectedClosedCycle.id
    );
    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? { ...vehicle, cycles: nextCycles }
          : vehicle
      )
    );
    setSelectedClosedCycleId(
      nextCycles.filter((cycle) => cycle.status === 'closed').at(-1)?.id ?? null
    );
    setError('');
  };

  const addVehicle = (event) => {
    event.preventDefault();
    const trimmedName = vehicleName.trim();
    if (!trimmedName) {
      setError('Vehicle name is required.');
      return;
    }

    const nextVehicle = createVehicle(trimmedName);
    setVehicles((current) => [...current, nextVehicle]);
    setActiveVehicleId(nextVehicle.id);
    setVehicleName('');
    setShowAddVehicle(false);
    setError('');
  };

  const removeVehicle = (vehicleId) => {
    if (vehicles.length === 1) {
      setError('At least one vehicle is required.');
      return;
    }

    const remaining = vehicles.filter((vehicle) => vehicle.id !== vehicleId);
    setVehicles(remaining);
    if (activeVehicleId === vehicleId) {
      setActiveVehicleId(remaining[0]?.id ?? null);
    }
    setError('');
  };

  const startCycle = (event) => {
    event.preventDefault();
    if (!activeVehicle) return;
    if (activeCycle) {
      setError('Close the current cycle before starting a new one.');
      return;
    }

    // Allow zero for first cycle
    const reading = parseNonNegative(startReading);
    if (reading === null) {
      setError('Enter a valid starting meter reading (zero or more).');
      return;
    }

    const cycle = createCycle(reading);
    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? { ...vehicle, cycles: [...vehicle.cycles, cycle] }
          : vehicle
      )
    );
    setStartReading('');
    setError('');
  };

  const addFill = (event) => {
    event.preventDefault();
    if (!activeVehicle || !activeCycle) {
      setError('Start a cycle before adding fuel fills.');
      return;
    }

    if (!petrolPriceValue) {
      setError('Set petrol price first in the common price section.');
      return;
    }

    const litres = parsePositive(fillLitres);
    if (!litres) {
      setError('Enter a valid fuel quantity greater than zero.');
      return;
    }

    const price = litres * petrolPriceValue;

    const fill = {
      id: uid(),
      litres,
      price,
      pricePerLitre: petrolPriceValue,
      date: new Date().toISOString(),
    };

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? {
              ...vehicle,
              cycles: vehicle.cycles.map((cycle) =>
                cycle.id === activeCycle.id
                  ? { ...cycle, fills: [...cycle.fills, fill] }
                  : cycle
              ),
            }
          : vehicle
      )
    );
    setFillLitres('');
    setError('');
  };

  const saveEndReading = (event) => {
    event.preventDefault();
    if (!activeVehicle || !activeCycle) {
      setError('Start a cycle before recording the end reading.');
      return;
    }

    if (!activeCycle.fills.length) {
      setError('Add at least one fuel fill before saving the end reading.');
      return;
    }

    const reading = parsePositive(endReading);
    if (!reading) {
      setError('Enter a valid ending meter reading.');
      return;
    }

    if (reading <= activeCycle.startReading) {
      setError('Ending reading must be greater than the starting reading.');
      return;
    }

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? {
              ...vehicle,
              cycles: vehicle.cycles.map((cycle) =>
                cycle.id === activeCycle.id
                  ? {
                      ...cycle,
                      endReading: reading,
                    }
                  : cycle
              ),
            }
          : vehicle
      )
    );
    setError('');
  };

  const closeCycle = (event) => {
    event.preventDefault();
    if (!activeVehicle || !activeCycle) {
      setError('Start a cycle before recording the end reading.');
      return;
    }

    if (!activeCycle.fills.length) {
      setError('Add at least one fuel fill before closing the cycle.');
      return;
    }

    const savedReading = parsePositive(activeCycle.endReading);
    if (!savedReading) {
      setError('Save the end meter reading first before closing the cycle.');
      return;
    }

    setVehicles((current) =>
      current.map((vehicle) =>
        vehicle.id === activeVehicle.id
          ? {
              ...vehicle,
              cycles: vehicle.cycles.map((cycle) =>
                cycle.id === activeCycle.id
                  ? {
                      ...cycle,
                      status: 'closed',
                      endReading: savedReading,
                      endAt: new Date().toISOString(),
                    }
                  : cycle
              ),
            }
          : vehicle
      )
    );
    setEndReading('');
    setError('');
  };

  const completionChips = [
    {
      label: '0. Petrol price',
      active: Boolean(petrolPriceValue),
      description: 'Set common petrol price per litre before fuel fills.',
    },
    {
      label: '1. Start reading',
      active: Boolean(activeCycle),
      description: 'Record the meter when the tank is near empty.',
    },
    {
      label: '2. Fuel fills',
      active: Boolean(activeCycle?.fills.length),
      description: 'Add every petrol fill between start and end.',
    },
    {
      label: '3. End reading',
      active: Boolean(latestClosedCycle),
      description: 'Record the next near-empty meter and calculate mileage.',
    },
  ];

  return (
    <main className="app-shell">
      <header className="hero-card">
        <h1 style={{ margin: 0, textAlign: 'center' }}>MileagePro</h1>
      </header>

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
                setError('');
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
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="add-vehicle-button"
          onClick={() => setShowAddVehicle((v) => !v)}
          aria-label="Add new vehicle"
        >
          <svg width="24" height="24" aria-hidden="true">
            <line
              x1="12"
              y1="5"
              x2="12"
              y2="19"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
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

      {showAddVehicle ? (
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
      ) : null}

      {!hasCycleEntries ? (
        <>
          <div className="instructions-header">
            <h2>How it works</h2>
          </div>
          <section className="steps panel">
            {completionChips.map((step) => (
              <div
                key={step.label}
                className={`step-card ${step.active ? 'active' : ''}`}
              >
                <span>{step.label}</span>
                <p>{step.description}</p>
              </div>
            ))}
          </section>
        </>
      ) : null}

      <SummaryPanel
        activeVehicle={activeVehicle}
        activeCycle={activeCycle}
        hasLastMileage={hasLastMileage}
        hasLastDistance={hasLastDistance}
        hasLastFuel={hasLastFuel}
        latestClosedCycleTotals={latestClosedCycleTotals}
        vehicleSummary={vehicleSummary}
      />

      {/* Centralized petrol price input */}
      <PetrolPricePanel
        petrolPricePanelCollapsed={petrolPricePanelCollapsed}
        setPetrolPricePanelCollapsed={setPetrolPricePanelCollapsed}
        blockNumberScroll={blockNumberScroll}
        blockNumberStepKeys={blockNumberStepKeys}
        petrolPrice={petrolPrice}
        setPetrolPrice={setPetrolPrice}
      />

      <section className="grid">
        <article className="panel form-panel">
          <h2>Current cycle actions</h2>

          {!activeCycle ? (
            <form onSubmit={startCycle} className="stack-form">
              <div className="panel-heading">
                <p className="section-label">Point 1</p>
              </div>
              <div className="field">
                <label htmlFor="start-reading">Start meter reading (km)</label>
                <input
                  id="start-reading"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  onWheelCapture={blockNumberScroll}
                  onKeyDown={blockNumberStepKeys}
                  value={startReading}
                  onChange={(event) => setStartReading(event.target.value)}
                  placeholder="Ex: 15432"
                />
                {latestClosedCycle?.endReading ? (
                  <p className="field-note">
                    Auto-filled from previous cycle end reading. You can edit
                    this value.
                  </p>
                ) : null}
              </div>
              <button type="submit">Save start reading</button>
            </form>
          ) : (
            <>
              <div className="callout in-progress-callout">
                Point 1 saved at {activeCycle.startReading.toFixed(1)} km. Add
                fuel fills anytime until the tank reaches near empty again.
              </div>

              <div className="two-up">
                <div className="stack-form">
                  <p className="section-label">Point 2</p>
                  {activeCycleTotals?.totalLitres ? (
                    <p className="callout in-progress-callout">
                      You filled tank -{' '}
                      {activeCycleTotals?.totalLitres.toFixed(2) ?? '0.00'}{' '}
                      litres so far. Add more fills as needed until the next
                      near-empty reading.
                    </p>
                  ) : null}
                  <form onSubmit={addFill} className="stack-form">
                    <div className="field">
                      <label htmlFor="fill-litres">Fuel filled (litres)</label>
                      <input
                        id="fill-litres"
                        type="number"
                        min="0.01"
                        step="0.01"
                        inputMode="decimal"
                        onWheelCapture={blockNumberScroll}
                        onKeyDown={blockNumberStepKeys}
                        value={fillLitres}
                        onChange={(event) => setFillLitres(event.target.value)}
                        placeholder="Ex: 18.5"
                      />
                    </div>
                    <p className="field-note">
                      Price paid is auto-calculated from petrol price × litres
                      {petrolPriceValue && fillLitresValue
                        ? ` = ${formatMoney(
                            petrolPriceValue * fillLitresValue
                          )}`
                        : ''}
                      .
                    </p>
                    <button type="submit">Add petrol fill</button>
                  </form>
                </div>

                {activeFillCount > 0 ? (
                  <div className="stack-form">
                    <div className="panel-heading">
                      <p className="section-label">Point 3</p>
                    </div>
                    <div className="field">
                      <label htmlFor="end-reading">
                        End meter reading (km)
                      </label>
                      <input
                        id="end-reading"
                        autoComplete="off"
                        type="number"
                        min="0.1"
                        step="0.1"
                        inputMode="decimal"
                        onWheelCapture={blockNumberScroll}
                        onKeyDown={blockNumberStepKeys}
                        value={endReading}
                        onChange={(event) => setEndReading(event.target.value)}
                        placeholder="Ex: 16120"
                      />
                      {activeCycle.endReading ? (
                        <p className="field-note">
                          Saved end reading: {activeCycle.endReading.toFixed(1)}{' '}
                          km. You can edit and save again.
                        </p>
                      ) : null}
                    </div>
                    <button type="button" onClick={saveEndReading}>
                      Save end meter reading
                    </button>
                    <button
                      type="button"
                      onClick={closeCycle}
                      disabled={!activeCycle.endReading}
                    >
                      Close cycle
                    </button>
                  </div>
                ) : (
                  <div className="stack-form">
                    <div className="callout end-callout">
                      Point 3 unlocks after you save at least one fuel fill.
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {error && <p className="error">{error}</p>}
        </article>
      </section>

      <section className="grid lower-grid">
        <article className="panel cycle-panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Open cycle</p>
              <h2>Cycle progress</h2>
            </div>
            <span className="status-pill subtle">
              {activeCycle ? 'Tracking' : 'Waiting'}
            </span>
          </div>

          {activeCycle ? (
            <div className="cycle-summary">
              <div className="cycle-bar">
                <span className="cycle-node done">1</span>
                <span
                  className={`cycle-line ${
                    activeCycle.fills.length ? 'done' : ''
                  }`}
                />
                <span
                  className={`cycle-node ${
                    activeCycle.fills.length ? 'done' : ''
                  }`}
                >
                  2
                </span>
                <span className="cycle-line muted" />
                <span
                  className={`cycle-node ${
                    activeCycle.status === 'closed' ? 'done' : ''
                  }`}
                >
                  3
                </span>
              </div>

              <div className="mini-grid">
                <div>
                  <p className="metric-label">Start reading</p>
                  <p className="metric-value">
                    {activeCycle.startReading.toFixed(1)} km
                  </p>
                </div>
                <div>
                  <p className="metric-label">Fuel fills</p>
                  <p className="metric-value">
                    {activeCycleTotals?.fillCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="metric-label">Fuel total</p>
                  <p className="metric-value">
                    {activeCycleTotals?.totalLitres.toFixed(2) ?? '0.00'} litres
                  </p>
                </div>
                <div>
                  <p className="metric-label">Spend total</p>
                  <p className="metric-value">
                    {formatMoney(activeCycleTotals?.totalCost ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="metric-label">End reading</p>
                  <p className="metric-value">
                    {activeCycle?.endReading?.toFixed(2) ?? '0.00'} km
                  </p>
                </div>
                {canShowApproxMileage ? (
                  <div>
                    <p className="metric-label">Approx mileage</p>
                    <p className="metric-value">
                      {approximateMileage?.toFixed(2)} km/l
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="empty-state">
              No open cycle yet. Save point 1 to begin tracking.
            </p>
          )}
        </article>

        <HistoryPanel
          completedCycles={completedCycles}
          selectedClosedCycle={selectedClosedCycle}
          selectedClosedCycleIndex={selectedClosedCycleIndex}
          selectedClosedCycleTotals={selectedClosedCycleTotals}
          deleteSelectedCycle={deleteSelectedCycle}
          goToPreviousCycle={goToPreviousCycle}
          goToNextCycle={goToNextCycle}
        />
      </section>
    </main>
  );
}

export default App;
