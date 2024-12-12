import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Thermometer, Droplets, Wind } from 'lucide-react';

// Configuration Netatmo
const CONFIG = {
  clientId: '675b634cde9686cb5c026d30',
  clientSecret: 'DPTngdKSgCJXTRLxhrYTuFK0bFtEw',
  redirectUri: 'https://votredomaine.com/callback', // Remplacez par votre domaine PlanetHoster
  scope: 'read_homecoach read_station',
  authUrl: 'https://api.netatmo.com/oauth2/authorize',
  tokenUrl: 'https://api.netatmo.com/oauth2/token',
  apiUrl: 'https://api.netatmo.com/api'
};

const NetatmoDashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonctions d'authentification
  const getAuthUrl = () => {
    const params = new URLSearchParams({
      client_id: CONFIG.clientId,
      redirect_uri: CONFIG.redirectUri,
      scope: CONFIG.scope,
      response_type: 'code',
    });
    return `${CONFIG.authUrl}?${params.toString()}`;
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('netatmo_refresh_token');
    if (!refreshToken) {
      throw new Error('Pas de refresh token disponible');
    }

    const response = await fetch(CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CONFIG.clientId,
        client_secret: CONFIG.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Erreur lors du rafraîchissement du token');
    }

    const data = await response.json();
    localStorage.setItem('netatmo_token', data.access_token);
    localStorage.setItem('netatmo_refresh_token', data.refresh_token);
    localStorage.setItem('netatmo_token_expiry', Date.now() + (data.expires_in * 1000));
    return data;
  };

  const checkToken = async () => {
    const token = localStorage.getItem('netatmo_token');
    const expiry = localStorage.getItem('netatmo_token_expiry');

    if (!token || !expiry) {
      return false;
    }

    if (Date.now() >= parseInt(expiry)) {
      try {
        await refreshToken();
        return true;
      } catch (error) {
        return false;
      }
    }

    return true;
  };

  // Fonction de récupération des données
  const getStationData = async () => {
    const token = localStorage.getItem('netatmo_token');
    if (!token) {
      throw new Error('Non authentifié');
    }

    const response = await fetch(`${CONFIG.apiUrl}/getstationsdata`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des données');
    }

    return await response.json();
  };

  const formatStationData = (data) => {
    return data.body.devices.map(device => ({
      id: device._id,
      name: device.module_name,
      temperature: device.dashboard_data.Temperature,
      humidity: device.dashboard_data.Humidity,
      co2: device.dashboard_data.CO2,
      lastUpdate: new Date(device.last_status_store * 1000).toISOString()
    }));
  };

  const loadStationData = async () => {
    try {
      const data = await getStationData();
      const formattedData = formatStationData(data);
      setSensors(formattedData);
      setIsLoading(false);
    } catch (err) {
      setError('Erreur de chargement des données');
      setIsLoading(false);
    }
  };

  const checkAuthAndLoadData = async () => {
    try {
      const isAuthenticated = await checkToken();
      if (!isAuthenticated) {
        window.location.href = getAuthUrl();
        return;
      }

      await loadStationData();
    } catch (err) {
      setError('Erreur d\'authentification');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const getTemperatureColor = (temp) => {
    if (temp < 18) return 'text-blue-500';
    if (temp > 24) return 'text-red-500';
    return 'text-green-500';
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="p-4">Chargement des données...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">{error}</p>
        <Button 
          onClick={checkAuthAndLoadData}
          className="mt-4"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Températures Intérieures</h1>
        <Button onClick={loadStationData}>Actualiser</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map(sensor => (
          <Card key={sensor.id} className="w-full">
            <CardHeader>
              <CardTitle className="text-xl">{sensor.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className={getTemperatureColor(sensor.temperature)} />
                    <span className="font-medium">Température</span>
                  </div>
                  <span className={`text-xl font-bold ${getTemperatureColor(sensor.temperature)}`}>
                    {sensor.temperature}°C
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="text-blue-500" />
                    <span className="font-medium">Humidité</span>
                  </div>
                  <span className="text-xl font-bold text-blue-500">
                    {sensor.humidity}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wind className="text-gray-500" />
                    <span className="font-medium">CO2</span>
                  </div>
                  <span className="text-xl font-bold text-gray-500">
                    {sensor.co2} ppm
                  </span>
                </div>

                <div className="text-sm text-gray-500 mt-4">
                  Dernière mise à jour : {formatDate(sensor.lastUpdate)}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NetatmoDashboard;