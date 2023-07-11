import flux from '@aust/react-flux';

// import './noticesStore';
import './wizardStore';

window.isDev().then((isDev) => {
  flux.setOption('displayLogs', isDev);
});

(window as any).flux = flux;
