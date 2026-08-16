import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { type ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import WelcomeScreen from '@/app/(auth)/welcome';
import HomeScreen from '@/app/(tabs)';
import InvitationsScreen from '@/app/(tabs)/invitations';
import PeopleScreen from '@/app/(tabs)/people';
import CreateActivityScreen from '@/app/create';
import { createSeedData, DEMO_USER_ID } from '@/data/seed';
import { loadPersistedState } from '@/data/storage';
import { AppProvider, useApp } from '@/state/app-context';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

jest.mock('expo-router', () => ({
  Redirect: () => null,
  useRouter: () => mockRouter,
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const mockedLoadPersistedState = jest.mocked(loadPersistedState);

function StateProbe() {
  const { state } = useApp();
  return (
    <>
      <Text testID="session-state">
        {state.hydrated ? 'hydrated' : 'hydrating'}:{state.session?.mode ?? 'none'}
      </Text>
      <Text testID="activity-titles">
        {state.activities.map((activity) => activity.title).join('|')}
      </Text>
    </>
  );
}

function SessionGate({ children }: { children: ReactNode }) {
  const { state } = useApp();
  if (!state.session) return <Text>Preparing demo</Text>;
  return (
    <>
      {children}
      <StateProbe />
    </>
  );
}

const flushPendingUpdates = () => new Promise<void>((resolve) => setImmediate(resolve));

const changeText = async (label: string, value: string) => {
  fireEvent.changeText(screen.getByLabelText(label), value);
  await flushPendingUpdates();
};

const renderWithApp = async (children: ReactNode) => {
  const result = render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <AppProvider>{children}</AppProvider>
    </SafeAreaProvider>,
  );
  await flushPendingUpdates();
  return result;
};

const renderInDemo = async (screenElement: ReactNode) => {
  mockedLoadPersistedState.mockResolvedValueOnce({
    version: 1,
    data: createSeedData(),
    session: { userId: DEMO_USER_ID, mode: 'demo' },
  });
  const result = await renderWithApp(<SessionGate>{screenElement}</SessionGate>);
  await waitFor(() =>
    expect(screen.getByTestId('session-state')).toHaveTextContent('hydrated:demo'),
  );
  return result;
};

describe('rendered application user flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadPersistedState.mockResolvedValue(null);
  });

  it('US-00 hydrates a clean install and enters the complete demo', async () => {
    await renderWithApp(
      <>
        <WelcomeScreen />
        <StateProbe />
      </>,
    );

    await waitFor(() => {
      expect(
        screen.getByText('Making friends can start with one simple invite.'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('session-state')).toHaveTextContent('hydrated:none');
    });

    fireEvent.press(screen.getByRole('button', { name: 'Explore the demo' }));
    await flushPendingUpdates();

    await waitFor(() => {
      expect(screen.getByTestId('session-state')).toHaveTextContent('hydrated:demo');
      expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('US-00 renders the plan feed after demo startup', async () => {
    await renderInDemo(<HomeScreen />);

    expect(screen.getByText('What sounds good?')).toBeOnTheScreen();
    expect(screen.getByText('Discover nearby')).toBeOnTheScreen();
    expect(screen.getByText('Canal walk & coffee')).toBeOnTheScreen();
    expect(screen.getByLabelText('Open your profile')).toBeOnTheScreen();
  });

  it('US-03 filters discoverable people through the rendered search field', async () => {
    await renderInDemo(<PeopleScreen />);

    await changeText('Search', 'Maya');

    await waitFor(() => {
      expect(screen.getByText('Maya Chen')).toBeOnTheScreen();
      expect(screen.getByText('1 people')).toBeOnTheScreen();
      expect(screen.queryByText('Jonas Weber')).not.toBeOnTheScreen();
    });
  });

  it('US-06 accepts a received invitation through the rendered controls', async () => {
    await renderInDemo(<InvitationsScreen />);

    fireEvent.press(screen.getAllByRole('button', { name: 'I’m in' })[0]);
    await flushPendingUpdates();

    await waitFor(() => expect(screen.getByText('accepted')).toBeOnTheScreen());
  });

  it('US-04 creates an activity through the rendered form', async () => {
    await renderInDemo(<CreateActivityScreen />);

    await changeText('Title', 'Neighborhood tea meetup');
    await changeText(
      'Description',
      'A relaxed hour for tea and conversation where everyone can arrive on their own.',
    );
    await changeText('Meeting place', 'Kiez café front table');
    await changeText('City', 'Berlin');
    fireEvent.press(screen.getByRole('button', { name: 'Create & invite people' }));
    await flushPendingUpdates();
    expect(screen.queryByRole('alert')).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('activity-titles')).toHaveTextContent(/Neighborhood tea meetup/);
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/invite/[activityId]' }),
      );
    });
  });
});
