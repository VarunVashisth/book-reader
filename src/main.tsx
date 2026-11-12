import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import './styles/global.css';

const savedTheme = localStorage.getItem('leaf-app-theme');
document.documentElement.dataset.appTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
registerSW({ immediate: true });
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
