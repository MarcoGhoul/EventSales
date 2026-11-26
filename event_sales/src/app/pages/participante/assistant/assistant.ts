import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, effect, ElementRef, inject, OnInit, OnDestroy, signal, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChatResponse, Conversation, FileInfo } from '../../../core/models/chat-response.model';
import { Mensaje } from '../../../core/models/mensaje.model';
import { AgentService } from '../../../core/services/agent.service';
import { EventResponse } from '../../../core/models/event-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';

const COLORES = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

@Component({
  imports: [
    DatePipe,
    NgTemplateOutlet,
    ReactiveFormsModule,
    RouterLink,
    BaseChartDirective,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  selector: 'app-assistant',
  styleUrl: './assistant.css',
  templateUrl: './assistant.html',
})
export class Assistant implements OnInit, OnDestroy {
  leyendo = signal<Mensaje | null>(null);
  fuenteAudio = signal('');
  estadoLectura = signal('');
  private solicitudVoz?: Subscription;

  detenerLectura() {
    this.solicitudVoz?.unsubscribe();
    if (this.leyendo() && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    const src = this.fuenteAudio();
    this.leyendo.set(null);
    this.fuenteAudio.set('');
    this.estadoLectura.set('');
    if (src.startsWith('blob:')) URL.revokeObjectURL(src);
  }

  ngOnDestroy() {
    this.detenerLectura();
  }

  leer(mensaje: Mensaje) {
    this.detenerLectura();
    this.leyendo.set(mensaje);
    if (mensaje.audio) {
      this.fuenteAudio.set('data:audio/wav;base64,' + mensaje.audio);
      return;
    }
    this.estadoLectura.set('Preparando la lectura…');
    this.solicitudVoz = this.agentService.leer(mensaje.texto).subscribe({
      next: (wav) => {
        this.estadoLectura.set('');
        this.fuenteAudio.set(URL.createObjectURL(wav));
      },
      error: () => {
        if (!('speechSynthesis' in window)) {
          this.estadoLectura.set('La voz no está disponible. Intenta de nuevo más tarde.');
          return;
        }
        const voz = new SpeechSynthesisUtterance(mensaje.texto);
        const disponibles = window.speechSynthesis.getVoices();
        voz.voice = ['es-PE', 'es-419', 'es-MX', 'es-CO', 'es-AR', 'es-CL', 'es-US']
          .map(lang => disponibles.find(v => v.lang.toLowerCase() === lang.toLowerCase()))
          .find(v => v !== undefined) ?? null;
        voz.lang = voz.voice?.lang ?? 'es-PE';
        this.estadoLectura.set('Usando la voz del dispositivo.');
        voz.onend = () => { if (this.leyendo() === mensaje) this.detenerLectura(); };
        voz.onerror = () => {
          if (this.leyendo() === mensaje) this.estadoLectura.set('No se pudo reproducir la voz del dispositivo.');
        };
        window.speechSynthesis.speak(voz);
      },
    });
  }

  private agentService = inject(AgentService);
  private eventService = inject(EventService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // "Ver": el detalle del evento se despliega en la misma tarjeta, sin cambiar de pantalla
  eventosAbiertos = signal<number[]>([]);
  detalles = signal<Record<number, EventResponse>>({});

  // El mismo asistente sirve a los dos roles: cambian los textos
  esOrganizador = inject(AuthService).session()?.role === 'ORGANIZER';

  // Lo que el agente puede resolver según el rol: se muestra al abrir una conversación nueva
  ayudas = this.esOrganizador
    ? [
        { titulo: 'Mis eventos', preguntas: ['Muéstrame mis eventos', '¿Qué eventos tengo en Lima?'] },
        { titulo: 'Ventas y gráficos', preguntas: ['¿Cuánto he vendido por evento?', 'Compárame mis eventos en un gráfico'] },
        { titulo: 'Reporte en Excel', preguntas: ['Dame el reporte de ventas en Excel'] },
        { titulo: 'Políticas', preguntas: ['¿Cómo funcionan los reembolsos?'] },
      ]
    : [
        { titulo: 'Buscar eventos', preguntas: ['¿Qué eventos hay disponibles?', '¿Qué eventos hay en Cusco?'] },
        { titulo: 'Cupos y precios', preguntas: ['¿Cuántos cupos quedan en Lima?', '¿Cuánto cuesta una entrada en Arequipa?'] },
        { titulo: 'Comprar entradas', preguntas: ['Quiero comprar una entrada de la Feria Gastronómica'] },
        { titulo: 'Políticas', preguntas: ['¿Cuál es la política de reembolso?', '¿Cómo funcionan los pagos?'] },
      ];
  limiteAgente = this.esOrganizador
    ? 'No compra entradas (es solo para participantes) y no anula ni reembolsa desde el chat.'
    : 'No anula entradas ni procesa reembolsos desde el chat: eso se hace desde Mis entradas o según la política.';

  // Permite limpiar el formulario sin que el campo quede en rojo por «enviado»
  @ViewChild(FormGroupDirective) private formulario?: FormGroupDirective;
  // La caja de mensajes: tiene scroll propio y siempre baja hasta el último mensaje
  @ViewChild('chat') private chat?: ElementRef<HTMLElement>;

  chatForm = new FormGroup({
    message: new FormControl('', [Validators.required, Validators.maxLength(1000)]),
  });

  mensajes = signal<Mensaje[]>([this.saludo()]);
  grabando = signal(false);
  private grabador?: MediaRecorder;
  private fragmentos: Blob[] = [];
  // Panel lateral: las conversaciones guardadas y la que está abierta (null = una nueva, aún sin guardar)
  conversaciones = signal<Conversation[]>([]);
  conversacionId = signal<string | null>(null);
  // El panel no pudo leer las conversaciones guardadas
  errorLista = signal(false);
  // Conversación que espera confirmación para borrarse
  porBorrar = signal<string | null>(null);
  escribiendo = signal(false);
  error = signal('');

  constructor() {
    // Cada vez que llega un mensaje (o aparece el indicador de escritura) se baja al final
    effect(() => {
      this.mensajes();
      this.escribiendo();
      setTimeout(() => {
        const caja = this.chat?.nativeElement;
        if (caja) caja.scrollTop = caja.scrollHeight;
      });
    });
  }

  disponible = signal<boolean | null>(null);

  ngOnInit() {
    this.agentService.status().subscribe({
      next: ({ enabled }) => {
        this.disponible.set(enabled);
        if (enabled) this.abrirAsistente();
      },
      error: () => this.error.set('No se pudo conectar con la API.'),
    });
  }

  private abrirAsistente() {
    this.cargarConversaciones();
    // Viene del botón «Comprar con HampCode» del detalle de un evento
    const evento = this.route.snapshot.queryParamMap.get('comprar');
    if (evento) {
      this.router.navigate([], { queryParams: { comprar: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.usar(`Quiero comprar una entrada de ${evento}`);
    }
  }

  private saludo(): Mensaje {
    return {
      autor: 'agente',
      texto: this.esOrganizador
        ? 'Hola, soy HampCode, tu agente. Puedo mostrarte tus eventos, comparar tus ventas con gráficos y generar tu reporte en Excel.'
        : 'Hola, soy HampCode, tu agente. Puedo buscar eventos, ver cupos, comprar entradas y resolver dudas sobre las políticas.',
    };
  }

  cargarConversaciones() {
    this.agentService.conversations().subscribe({
      next: (lista) => {
        this.errorLista.set(false);
        this.conversaciones.set(lista);
      },
      // El chat funciona igual, pero se avisa en el panel para que no parezca que no se guardó nada
      error: () => this.errorLista.set(true),
    });
  }

  // «Nueva conversación»: pantalla en blanco; se guarda al enviar el primer mensaje
  nueva() {
    if (this.escribiendo()) return;
    this.detenerLectura();
    this.conversacionId.set(null);
    this.mensajes.set([this.saludo()]);
    this.porBorrar.set(null);
    this.error.set('');
  }

  abrir(id: string) {
    if (this.escribiendo() || id === this.conversacionId()) return;
    this.agentService.messages(id).subscribe({
      next: (historial) => {
        this.detenerLectura();
        this.conversacionId.set(id);
        this.porBorrar.set(null);
        this.error.set('');
        this.mensajes.set([this.saludo(), ...historial.map((m) => ({ autor: m.autor, texto: m.texto }))]);
      },
      error: (err) => this.error.set(err.error?.message ?? 'No se pudo abrir la conversación'),
    });
  }

  borrar(id: string) {
    this.agentService.deleteConversation(id).subscribe({
      next: () => {
        this.porBorrar.set(null);
        if (id === this.conversacionId()) this.nueva();
        this.cargarConversaciones();
      },
      error: (err) => this.error.set(err.error?.message ?? 'No se pudo borrar la conversación'),
    });
  }

  enviar() {
    const texto = (this.chatForm.value.message ?? '').trim();
    if (this.chatForm.invalid || !texto) return;
    this.formulario?.resetForm({ message: '' });
    this.enviarTexto(texto);
  }

  usar(pregunta: string) {
    this.enviarTexto(pregunta);
  }

  // Los botones llaman a la API de confirmación: la compuerta del servidor ejecuta la acción,
  // sin pasar por el modelo
  confirmar() {
    this.responder('Sí, confirmo', this.agentService.confirm(this.conversacionId()));
  }

  rechazar() {
    this.responder('No, cancela', this.agentService.reject(this.conversacionId()));
  }

  private enviarTexto(texto: string) {
    this.responder(texto, this.agentService.chat(texto, this.conversacionId()));
  }

  // Camino común del chat y de los botones: muestra lo que dijo el usuario y la respuesta del servidor
  private responder(texto: string, peticion: Observable<ChatResponse>) {
    if (this.escribiendo()) return;
    this.mensajes.update((lista) => [...lista, { autor: 'usuario', texto }]);
    this.escribiendo.set(true);
    this.error.set('');

    peticion.subscribe({
      next: (respuesta) => {
        this.escribiendo.set(false);
        this.agregarRespuesta(respuesta);
        // Una conversación nueva ya existe en el backend: se abre en el panel y sube al primer lugar
        if (respuesta.conversationId) this.conversacionId.set(respuesta.conversationId);
        this.cargarConversaciones();
      },
      error: (err) => {
        this.escribiendo.set(false);
        this.error.set(err.error?.message ?? 'HampCode no pudo responder, intenta de nuevo');
      },
    });
  }

  async alternarGrabacion() {
    if (this.grabando()) {
      this.grabador?.stop();
      return;
    }
    if (this.escribiendo()) return;
    try {
      const microfono = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.fragmentos = [];
      this.grabador = new MediaRecorder(microfono);
      this.grabador.ondataavailable = (evento) => this.fragmentos.push(evento.data);
      this.grabador.onstop = () => {
        microfono.getTracks().forEach((pista) => pista.stop());
        this.grabando.set(false);
        this.enviarAudio(new Blob(this.fragmentos, { type: this.grabador?.mimeType }));
      };
      this.grabador.start();
      this.grabando.set(true);
      this.error.set('');
    } catch {
      this.error.set('No se pudo usar el micrófono. Revisa los permisos del navegador.');
    }
  }

  private enviarAudio(audio: Blob) {
    if (audio.size === 0) return;
    this.mensajes.update((lista) => [...lista, { autor: 'usuario', texto: 'Procesando tu audio…' }]);
    this.escribiendo.set(true);

    this.agentService.voice(audio, this.nombreDelAudio(audio), this.conversacionId()).subscribe({
      next: (voz) => {
        this.escribiendo.set(false);
        this.mensajes.update((lista) => lista.map((mensaje, i) => (i === lista.length - 1 ? { ...mensaje, texto: voz.transcript } : mensaje)));
        this.agregarRespuesta(voz.response, voz.audio ?? undefined);
        if (voz.response.conversationId) this.conversacionId.set(voz.response.conversationId);
        this.cargarConversaciones();
        if (voz.audio) this.leer(this.mensajes()[this.mensajes().length - 1]);
      },
      error: (err) => {
        this.escribiendo.set(false);
        this.mensajes.update((lista) => lista.slice(0, -1));
        this.error.set(err.error?.message ?? 'No se pudo procesar el audio, intenta de nuevo');
      },
    });
  }

  private nombreDelAudio(audio: Blob) {
    if (audio.type.includes('mp4')) return 'audio.mp4';
    if (audio.type.includes('ogg')) return 'audio.ogg';
    return 'audio.webm';
  }

  private agregarRespuesta(respuesta: ChatResponse, audio?: string) {
    this.mensajes.update((lista) => [
      ...lista,
      {
        autor: 'agente',
        texto: respuesta.message,
        audio,
        respuesta,
        grafico: respuesta.chart ? this.armarGrafico(respuesta.chart) : undefined,
      },
    ]);
  }

  // Convierte el gráfico del backend en la configuración de ng2-charts
  private armarGrafico(chart: ChartData): ChartConfiguration<'bar' | 'pie'> {
    return {
      type: chart.type,
      data: {
        labels: chart.labels,
        datasets: [{ data: chart.values, label: chart.title, backgroundColor: COLORES }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        // En las barras la leyenda repetiría el título; en el circular sí identifica cada porción
        plugins: { title: { display: true, text: chart.title }, legend: { display: chart.type === 'pie' } },
      },
    };
  }

  estaAbierto(eventId: number | null | undefined) {
    return eventId != null && this.eventosAbiertos().includes(eventId);
  }

  // Abre o cierra el detalle; los datos se piden una sola vez por evento
  verDetalle(eventId: number | null | undefined) {
    if (eventId == null) return;
    if (this.estaAbierto(eventId)) {
      this.eventosAbiertos.update((ids) => ids.filter((id) => id !== eventId));
      return;
    }
    this.eventosAbiertos.update((ids) => [...ids, eventId]);
    if (this.detalles()[eventId]) return;
    this.eventService.getEvent(eventId).subscribe({
      next: (evento) => this.detalles.update((todos) => ({ ...todos, [eventId]: evento })),
      error: () => {
        this.eventosAbiertos.update((ids) => ids.filter((id) => id !== eventId));
        this.error.set('No se pudo cargar el detalle del evento');
      },
    });
  }

  descargar(file: FileInfo) {
    const bytes = Uint8Array.from(atob(file.content), (character) => character.charCodeAt(0));
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([bytes]));
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
