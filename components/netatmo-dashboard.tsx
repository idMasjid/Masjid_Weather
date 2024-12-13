'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Thermometer, Droplets, Wind } from 'lucide-react';

const NetatmoDashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = async () => {
    try {
      const response = await fetch('https://api.netatmo.com/api/getstationsdata', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_NETATMO_TOKEN || '642fc4b57909449dc9033396|663e79f9126016d86c60a240e814b41a'}`
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const data = await response.json();
      const formattedData = data.body.devices.map(device => ({
        id: device._id,
        name: device.module_name,
        temperature: device.dashboard_data.Temperature,
        humidity: device.dashboard_data.Humidity,
        co2: device.dashboard_data.CO2,
        lastUpdate: new Date(device.last_status_store * 1000).toISOString()
      }));

      setSensors(formattedData);
      setIsLoading(false);
    } catch (err) {
      setError('Erreur de chargement des données');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Rafraîchir les données toutes les 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
          onClick={fetchData}
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
        <Button onClick={fetchData}>Actualiser</Button>
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