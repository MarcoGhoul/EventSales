import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { EventResponse } from '../../../core/models/event-response.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';

import { TicketService } from '../../../core/services/ticket.service';
import { AgentService } from '../../../core/services/agent.service';

@Component({
  imports: [DatePipe, UpperCasePipe, RouterLink, MatButtonModule, MatCardModule, MatDividerModule],
  selector: 'app-event-detail',
  styleUrl: './event-detail.css',
  templateUrl: './event-detail.html',
})
export class EventDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private eventService = inject(EventService);
  auth = inject(AuthService);
  private ticketService = inject(TicketService);
  private router = inject(Router);
  private agent = inject(AgentService);
  asistenteActivo = signal(false);
  comprando = signal(false);

  comprar(eventId: number) {
    if (this.comprando()) return;
    this.comprando.set(true);
    this.error.set('');
    this.ticketService.checkout(eventId).subscribe({
      next: () => this.router.navigateByUrl('/participante/my-tickets'),
      error: (err) => {
        this.comprando.set(false);
        this.error.set(err.error?.message ?? 'Verifica Mis entradas antes de volver a intentar la compra.');
      },
    });
  }

  evento = signal<EventResponse | null>(null);
  error = signal('');

  // La API no vende entradas de eventos que ya pasaron (la fecha llega como AAAA-MM-DD)
  hoy = new Date().toLocaleDateString('en-CA');

  ngOnInit() {
    this.agent.status().subscribe({
      next: ({ enabled }) => this.asistenteActivo.set(enabled),
      error: () => this.asistenteActivo.set(false),
    });
    this.route.paramMap.subscribe((params) => {
      this.eventService.getEvent(Number(params.get('id'))).subscribe({
        next: (evento) => {
          this.error.set('');
          this.evento.set(evento);
        },
        error: (err) => this.error.set(err.error?.message ?? 'No se pudo cargar el evento'),
      });
    });
  }
}
