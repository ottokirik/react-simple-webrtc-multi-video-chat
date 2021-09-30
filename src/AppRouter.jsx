import { Main } from 'pages/main/Main';
import { NotFound404 } from 'pages/not-found-404/NotFound404';
import { Room } from 'pages/room/Room';
import { Switch, Route } from 'react-router-dom';

export const RouteNames = {
  main: '/',
  room: '/room/:id',
};

export const publicRoutes = [
  { path: RouteNames.main, exact: true, component: Main },
  { path: RouteNames.room, exact: false, component: Room },
];

export const AppRouter = () => {
  return (
    <Switch>
      {publicRoutes.map((route) => {
        return <Route {...route} />;
      })}
      <Route component={NotFound404} />
    </Switch>
  );
};
