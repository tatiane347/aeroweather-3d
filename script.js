// 1. Configuração da Cena 3D Leve (Three.js)
const canvas = document.getElementById('weather-canvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const particlesCount = 180;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i += 3) {
  positions[i] = (Math.random() - 0.5) * 10;
  positions[i + 1] = Math.random() * 10;
  positions[i + 2] = (Math.random() - 0.5) * 10;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const material = new THREE.PointsMaterial({
  color: 0x00f0ff,
  size: 0.05,
  transparent: true,
  opacity: 0.6
});

const rain = new THREE.Points(geometry, material);
scene.add(rain);
camera.position.z = 5;

function animate() {
  requestAnimationFrame(animate);
  const pos = rain.geometry.attributes.position.array;
  for (let i = 1; i < particlesCount * 3; i += 3) {
    pos[i] -= 0.04;
    if (pos[i] < -5) pos[i] = 5;
  }
  rain.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 2. Dicionário de Códigos WMO (Clima)
const weatherCodes = {
  0: "Céu Limpo ☀️",
  1: "Predominantemente Limpo 🌤️",
  2: "Parcialmente Nublado ⛅",
  3: "Ensolarado / Nublado ☁️",
  45: "Névoa 🌫️",
  51: "Garoa Leve 🌧️",
  61: "Chuva Leve 🌧️",
  63: "Chuva Moderada 🌧️",
  80: "Pancadas de Chuva 🌩️",
  95: "Tempestade com Trovoadas ⚡"
};

// Armazena o estado atual do clima para o WhatsApp
let dadosClimaAtuais = {
  cidade: "São Paulo - São Paulo",
  temp: "14°C",
  desc: "Ensolarado / Nublado"
};

// 3. Atualizar Clima por Coordenadas (Lat / Lon)
async function atualizarClimaPorCoordenadas(lat, lon, nomeExibicao) {
  const cityDisplay = document.getElementById('city-name');
  const tempDisplay = document.getElementById('temp-display');
  const descDisplay = document.getElementById('weather-desc');

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const weatherData = await res.json();

    if (weatherData && weatherData.current_weather) {
      const temp = Math.round(weatherData.current_weather.temperature);
      const code = weatherData.current_weather.weathercode;

      dadosClimaAtuais.temp = `${temp}°C`;
      dadosClimaAtuais.desc = weatherCodes[code] || "Clima Atualizado 🌤️";
      dadosClimaAtuais.cidade = nomeExibicao;

      if (tempDisplay) tempDisplay.textContent = dadosClimaAtuais.temp;
      if (descDisplay) descDisplay.textContent = dadosClimaAtuais.desc;
      if (cityDisplay) cityDisplay.textContent = dadosClimaAtuais.cidade;
    }
  } catch (error) {
    console.error("Erro ao buscar clima:", error);
  }
}

// 4. Pesquisa Por Nome de Cidade ou Estado
async function pesquisarLocalidade(query) {
  if (!query || query.trim() === "") return;

  const cityDisplay = document.getElementById('city-name');
  if (cityDisplay) cityDisplay.textContent = "Buscando...";

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
    const data = await res.json();

    if (data && data.length > 0) {
      const lat = data[0].lat;
      const lon = data[0].lon;
      const nomeEncontrado = data[0].display_name.split(',').slice(0, 2).join(' -');

      await atualizarClimaPorCoordenadas(lat, lon, nomeEncontrado);
    } else {
      if (cityDisplay) cityDisplay.textContent = "Local não encontrado";
    }
  } catch (error) {
    console.error("Erro na busca de localidade:", error);
  }
}

// 5. Obter Localização via GPS Automática
function obterClimaInicial() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const locRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const locData = await locRes.json();
          const addr = locData.address || {};
          const cidade = addr.city || addr.town || addr.state || "Sua Região";
          const estado = addr.state || "";

          const nomeFormatado = estado ? `${cidade} - ${estado}` : cidade;
          await atualizarClimaPorCoordenadas(lat, lon, nomeFormatado);
        } catch (e) {
          atualizarClimaPorCoordenadas(lat, lon, "São Paulo - São Paulo");
        }
      },
      () => {
        atualizarClimaPorCoordenadas(-23.5505, -46.6333, "São Paulo - São Paulo");
      }
    );
  } else {
    atualizarClimaPorCoordenadas(-23.5505, -46.6333, "São Paulo - São Paulo");
  }
}

// 6. Botão de Disparo WhatsApp & Eventos de Busca
function inicializarInteracoes() {
  const searchInput = document.getElementById('city-input');
  const searchBtn = document.getElementById('search-btn');

  // Evento do botão de busca
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      if (searchInput) pesquisarLocalidade(searchInput.value);
    });
  }

  // Evento do Tecla ENTER na busca
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        pesquisarLocalidade(searchInput.value);
      }
    });
  }

  // Disparo do WhatsApp
  const botoes = document.querySelectorAll('button');
  botoes.forEach(botao => {
    if (botao.textContent.includes('Ativar Alertas')) {
      botao.addEventListener('click', (e) => {
        e.preventDefault();
        const numeroWhatsapp = "5511910526709";

        const mensagemTexto = `Olá! Gostaria de ativar os *Alertas em Tempo Real de Tempestades* no meu WhatsApp.\n\n` +
          `📍 *Região Pesquisada:* ${dadosClimaAtuais.cidade}\n` +
          `🌡️ *Temperatura Atual:* ${dadosClimaAtuais.temp}\n` +
          `☁️ *Condição:* ${dadosClimaAtuais.desc}\n\n` +
          `Por favor, cadastre meu número para receber atualizações da AeroWeather!`;

        window.open(`https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemTexto)}`, '_blank');
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  obterClimaInicial();
  inicializarInteracoes();
});

