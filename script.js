// Обновление страницы при клике на логотип
const logo = document.getElementById('logo');
if (logo) {
    logo.addEventListener('click', () => {
        window.location.reload();
    });
}

// Мобильное меню
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.nav-menu');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });
}

// Закрытие меню при клике на ссылку
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
});

// Активная ссылка в навигации при прокрутке
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a');

function updateActiveNav() {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');

        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            current = sectionId;
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        const href = link.getAttribute('href');
        if (href === `#${current}`) {
            link.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveNav);

// Плавная прокрутка для якорных ссылок
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Обработка формы заказа
const orderForm = document.getElementById('orderForm');
const formSuccess = document.getElementById('formSuccess');

if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Собираем данные формы
        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value,
            quantity: document.getElementById('quantity').value,
            plantType: document.getElementById('plantType').value,
            specificPlant: document.getElementById('specificPlant').value,
            deadline: document.getElementById('deadline').value,
            comments: document.getElementById('comments').value,
            timestamp: new Date().toISOString()
        };

        // В реальном приложении здесь был бы запрос к серверу
        // Для демонстрации сохраняем в localStorage и показываем успех
        try {
            // Сохраняем заказ в localStorage (в реальном приложении отправляем на сервер)
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push(formData);
            localStorage.setItem('orders', JSON.stringify(orders));

            // Показываем сообщение об успехе
            orderForm.style.display = 'none';
            formSuccess.style.display = 'block';

            // Прокручиваем к сообщению об успехе
            formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Можно также отправить данные на сервер:
            // const response = await fetch('/api/orders', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(formData)
            // });
            // const result = await response.json();

            console.log('Заказ сохранен:', formData);
        } catch (error) {
            console.error('Ошибка при сохранении заказа:', error);
            alert('Произошла ошибка при отправке заказа. Пожалуйста, попробуйте еще раз.');
        }
    });
}

// Настройка видео камер
// ВАЖНО: Замените эти URL на реальные адреса ваших камер
const cameraUrls = {
    camera1: '', // URL для камеры 1 (например: 'https://example.com/stream1.m3u8' или 'https://example.com/camera1')
    camera2: '', // URL для камеры 2
    camera3: ''  // URL для камеры 3
};

// Функция для создания видео элемента
function createVideoElement(cameraId, url) {
    const container = document.getElementById(cameraId);
    if (!container || !url) return;

    // Удаляем overlay
    const overlay = container.querySelector('.video-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }

    // Создаем видео элемент
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';

    // Если это HLS поток
    if (url.includes('.m3u8')) {
        if (typeof Hls !== 'undefined') {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.error('Ошибка воспроизведения:', e));
            });
        } else {
            // Fallback для браузеров с нативной поддержкой HLS
            video.src = url;
        }
    } else if (url.includes('rtsp://')) {
        // Для RTSP потоков нужен специальный сервер (например, WebRTC gateway)
        console.warn('RTSP потоки требуют специальной настройки сервера');
    } else {
        // Обычное видео или iframe
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // YouTube видео
            const iframe = document.createElement('iframe');
            iframe.src = url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.frameBorder = '0';
            iframe.allow = 'autoplay; encrypted-media';
            iframe.allowFullscreen = true;
            container.appendChild(iframe);
        } else {
            // Обычное видео
            video.src = url;
            container.appendChild(video);
        }
    }

    // Обработка ошибок
    video.addEventListener('error', (e) => {
        console.error(`Ошибка загрузки видео для ${cameraId}:`, e);
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.querySelector('p').textContent = 'Ошибка подключения к камере';
        }
    });
}

// Инициализация камер
function initializeCameras() {
    // Проверяем, есть ли URL для камер
    if (cameraUrls.camera1) {
        createVideoElement('camera1', cameraUrls.camera1);
    }
    if (cameraUrls.camera2) {
        createVideoElement('camera2', cameraUrls.camera2);
    }
    if (cameraUrls.camera3) {
        createVideoElement('camera3', cameraUrls.camera3);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeCameras();
    updateActiveNav();
});

// Анимация появления элементов при прокрутке
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Применяем анимацию к карточкам
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.feature-card, .camera-card, .tech-list li');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Валидация телефона
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value[0] === '8') {
                value = '7' + value.slice(1);
            }
            if (value[0] !== '7') {
                value = '7' + value;
            }
            let formatted = '+7';
            if (value.length > 1) {
                formatted += ' (' + value.slice(1, 4);
            }
            if (value.length >= 4) {
                formatted += ') ' + value.slice(4, 7);
            }
            if (value.length >= 7) {
                formatted += '-' + value.slice(7, 9);
            }
            if (value.length >= 9) {
                formatted += '-' + value.slice(9, 11);
            }
            e.target.value = formatted;
        }
    });
}

// Установка минимальной даты для deadline (сегодня)
const deadlineInput = document.getElementById('deadline');
if (deadlineInput) {
    const today = new Date().toISOString().split('T')[0];
    deadlineInput.setAttribute('min', today);
}

// Анимация веток роз при скролле
const roseBranches = document.querySelectorAll('.rose-branch');

function animateRoseBranches() {
    const scrollY = window.pageYOffset;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Параллакс эффект - ветки двигаются медленнее, чем скролл
    const parallaxSpeed = 0.3;
    const translateY = scrollY * parallaxSpeed;
    
    roseBranches.forEach((branch, index) => {
        // Легкое покачивание для реалистичности
        const sway = Math.sin(scrollY * 0.005) * 5;
        
        // Левая ветка движется вниз, правая - вверх (зеркально)
        if (index === 0) {
            branch.style.transform = `translate(${sway}px, ${translateY}px)`;
        } else {
            branch.style.transform = `scaleX(-1) translate(${-sway}px, ${-translateY}px)`;
        }
        
        // Изменение прозрачности в зависимости от позиции скролла
        const maxScroll = documentHeight - windowHeight;
        const scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;
        const opacity = 0.4 + (Math.sin(scrollProgress * Math.PI) * 0.3);
        branch.style.opacity = Math.max(0.3, Math.min(0.7, opacity));
    });
}

// Обработчик события скролла для веток роз
let ticking = false;
function onScrollRoseBranches() {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            animateRoseBranches();
            ticking = false;
        });
        ticking = true;
    }
}

window.addEventListener('scroll', onScrollRoseBranches, { passive: true });
window.addEventListener('resize', animateRoseBranches);

// Инициализация веток роз при загрузке
document.addEventListener('DOMContentLoaded', () => {
    animateRoseBranches();
});
