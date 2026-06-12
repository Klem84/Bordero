export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agrement_events: {
        Row: {
          agrement_id: string
          created_at: string
          created_by: string | null
          date_evenement: string
          id: string
          notification_pdf_url: string | null
          notifie_le: string | null
          organisation_id: string
          payload: Json
          statut: string | null
          type: string
        }
        Insert: {
          agrement_id: string
          created_at?: string
          created_by?: string | null
          date_evenement?: string
          id?: string
          notification_pdf_url?: string | null
          notifie_le?: string | null
          organisation_id: string
          payload?: Json
          statut?: string | null
          type: string
        }
        Update: {
          agrement_id?: string
          created_at?: string
          created_by?: string | null
          date_evenement?: string
          id?: string
          notification_pdf_url?: string | null
          notifie_le?: string | null
          organisation_id?: string
          payload?: Json
          statut?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agrement_events_agrement_id_fkey"
            columns: ["agrement_id"]
            isOneToOne: false
            referencedRelation: "agrements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agrement_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      agrements: {
        Row: {
          arrete_pdf_url: string | null
          created_at: string
          created_by: string | null
          date_delivrance: string
          date_echeance: string
          departement_code: string
          departement_libelle: string | null
          filieres: Json
          id: string
          lieux_depotage: Json
          numero: string
          organisation_id: string
          quantite_max_annuelle_m3: number | null
          statut: Database["public"]["Enums"]["agrement_statut"]
          updated_at: string
        }
        Insert: {
          arrete_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          date_delivrance: string
          date_echeance: string
          departement_code: string
          departement_libelle?: string | null
          filieres?: Json
          id?: string
          lieux_depotage?: Json
          numero: string
          organisation_id: string
          quantite_max_annuelle_m3?: number | null
          statut?: Database["public"]["Enums"]["agrement_statut"]
          updated_at?: string
        }
        Update: {
          arrete_pdf_url?: string | null
          created_at?: string
          created_by?: string | null
          date_delivrance?: string
          date_echeance?: string
          departement_code?: string
          departement_libelle?: string | null
          filieres?: Json
          id?: string
          lieux_depotage?: Json
          numero?: string
          organisation_id?: string
          quantite_max_annuelle_m3?: number | null
          statut?: Database["public"]["Enums"]["agrement_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agrements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          actif: boolean
          created_at: string
          email: string | null
          id: string
          nom: string | null
          organisation_id: string
          role: Database["public"]["Enums"]["app_role"]
          telephone: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          email?: string | null
          id: string
          nom?: string | null
          organisation_id: string
          role: Database["public"]["Enums"]["app_role"]
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nom?: string | null
          organisation_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          after: Json | null
          at: string
          before: Json | null
          id: string
          organisation_id: string | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: string
          organisation_id?: string | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          after?: Json | null
          at?: string
          before?: Json | null
          id?: string
          organisation_id?: string | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      bordereau_signatures: {
        Row: {
          bordereau_id: string
          gps: unknown
          id: string
          nom: string | null
          organisation_id: string
          role: Database["public"]["Enums"]["signataire_role"]
          signature_url: string | null
          signe_le: string
        }
        Insert: {
          bordereau_id: string
          gps?: unknown
          id?: string
          nom?: string | null
          organisation_id: string
          role: Database["public"]["Enums"]["signataire_role"]
          signature_url?: string | null
          signe_le?: string
        }
        Update: {
          bordereau_id?: string
          gps?: unknown
          id?: string
          nom?: string | null
          organisation_id?: string
          role?: Database["public"]["Enums"]["signataire_role"]
          signature_url?: string | null
          signe_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "bordereau_signatures_bordereau_id_fkey"
            columns: ["bordereau_id"]
            isOneToOne: false
            referencedRelation: "bordereaux"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordereau_signatures_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      bordereaux: {
        Row: {
          agrement_id: string | null
          annule_le: string | null
          boucle_le: string | null
          created_at: string
          created_by: string | null
          depose_le: string | null
          emis_le: string
          exutoire_id: string | null
          id: string
          intervention_id: string | null
          motif_annulation: string | null
          nature_matiere: string | null
          numero: string
          organisation_id: string
          pdf_sha256: string | null
          pdf_url: string | null
          quantite_depotee_m3: number | null
          quantite_pompee_m3: number | null
          signe_client_le: string | null
          statut: Database["public"]["Enums"]["bordereau_statut"]
          type: Database["public"]["Enums"]["bordereau_type"]
          updated_at: string
        }
        Insert: {
          agrement_id?: string | null
          annule_le?: string | null
          boucle_le?: string | null
          created_at?: string
          created_by?: string | null
          depose_le?: string | null
          emis_le?: string
          exutoire_id?: string | null
          id?: string
          intervention_id?: string | null
          motif_annulation?: string | null
          nature_matiere?: string | null
          numero: string
          organisation_id: string
          pdf_sha256?: string | null
          pdf_url?: string | null
          quantite_depotee_m3?: number | null
          quantite_pompee_m3?: number | null
          signe_client_le?: string | null
          statut?: Database["public"]["Enums"]["bordereau_statut"]
          type: Database["public"]["Enums"]["bordereau_type"]
          updated_at?: string
        }
        Update: {
          agrement_id?: string | null
          annule_le?: string | null
          boucle_le?: string | null
          created_at?: string
          created_by?: string | null
          depose_le?: string | null
          emis_le?: string
          exutoire_id?: string | null
          id?: string
          intervention_id?: string | null
          motif_annulation?: string | null
          nature_matiere?: string | null
          numero?: string
          organisation_id?: string
          pdf_sha256?: string | null
          pdf_url?: string | null
          quantite_depotee_m3?: number | null
          quantite_pompee_m3?: number | null
          signe_client_le?: string | null
          statut?: Database["public"]["Enums"]["bordereau_statut"]
          type?: Database["public"]["Enums"]["bordereau_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bordereaux_agrement_id_fkey"
            columns: ["agrement_id"]
            isOneToOne: false
            referencedRelation: "agrements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordereaux_exutoire_id_fkey"
            columns: ["exutoire_id"]
            isOneToOne: false
            referencedRelation: "exutoires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordereaux_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordereaux_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_planning_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bordereaux_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      camions: {
        Row: {
          actif: boolean
          adr_validite: string | null
          capacite_citerne_m3: number
          controle_technique_echeance: string | null
          created_at: string
          created_by: string | null
          equipements: Json
          id: string
          immatriculation: string
          organisation_id: string
          type: Database["public"]["Enums"]["camion_type"]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          adr_validite?: string | null
          capacite_citerne_m3: number
          controle_technique_echeance?: string | null
          created_at?: string
          created_by?: string | null
          equipements?: Json
          id?: string
          immatriculation: string
          organisation_id: string
          type?: Database["public"]["Enums"]["camion_type"]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          adr_validite?: string | null
          capacite_citerne_m3?: number
          controle_technique_echeance?: string | null
          created_at?: string
          created_by?: string | null
          equipements?: Json
          id?: string
          immatriculation?: string
          organisation_id?: string
          type?: Database["public"]["Enums"]["camion_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          canal_contact: Database["public"]["Enums"]["canal_contact"]
          conditions_paiement: string | null
          consentement_relances: boolean
          created_at: string
          created_by: string | null
          email: string | null
          encours_cents: number
          exclu_relances: boolean
          id: string
          nom: string
          organisation_id: string
          siret: string | null
          telephone: string | null
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
        }
        Insert: {
          canal_contact?: Database["public"]["Enums"]["canal_contact"]
          conditions_paiement?: string | null
          consentement_relances?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          encours_cents?: number
          exclu_relances?: boolean
          id?: string
          nom: string
          organisation_id: string
          siret?: string | null
          telephone?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Update: {
          canal_contact?: Database["public"]["Enums"]["canal_contact"]
          conditions_paiement?: string | null
          consentement_relances?: boolean
          created_at?: string
          created_by?: string | null
          email?: string | null
          encours_cents?: number
          exclu_relances?: boolean
          id?: string
          nom?: string
          organisation_id?: string
          siret?: string | null
          telephone?: string | null
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      commande_lignes: {
        Row: {
          commande_id: string
          designation: string
          id: string
          ordre: number
          organisation_id: string
          prestation_id: string | null
          prix_ht_cents: number
          quantite: number
          tva_taux: number
        }
        Insert: {
          commande_id: string
          designation: string
          id?: string
          ordre?: number
          organisation_id: string
          prestation_id?: string | null
          prix_ht_cents?: number
          quantite?: number
          tva_taux?: number
        }
        Update: {
          commande_id?: string
          designation?: string
          id?: string
          ordre?: number
          organisation_id?: string
          prestation_id?: string | null
          prix_ht_cents?: number
          quantite?: number
          tva_taux?: number
        }
        Relationships: [
          {
            foreignKeyName: "commande_lignes_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commande_lignes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commande_lignes_prestation_id_fkey"
            columns: ["prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          devis_id: string | null
          id: string
          notes: string | null
          organisation_id: string
          site_id: string
          updated_at: string
          urgence: boolean
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          devis_id?: string | null
          id?: string
          notes?: string | null
          organisation_id: string
          site_id: string
          updated_at?: string
          urgence?: boolean
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          devis_id?: string | null
          id?: string
          notes?: string | null
          organisation_id?: string
          site_id?: string
          updated_at?: string
          urgence?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "commandes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "commandes_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["site_id"]
          },
        ]
      }
      compteurs: {
        Row: {
          annee: number
          dernier_numero: number
          organisation_id: string
          type_doc: string
        }
        Insert: {
          annee: number
          dernier_numero?: number
          organisation_id: string
          type_doc: string
        }
        Update: {
          annee?: number
          dernier_numero?: number
          organisation_id?: string
          type_doc?: string
        }
        Relationships: [
          {
            foreignKeyName: "compteurs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          accepte_le: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          numero: string | null
          organisation_id: string
          signature_url: string | null
          site_id: string | null
          statut: Database["public"]["Enums"]["devis_statut"]
          token_public: string | null
          total_ht_cents: number
          total_ttc_cents: number
          updated_at: string
          validite_jusqu: string | null
        }
        Insert: {
          accepte_le?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          numero?: string | null
          organisation_id: string
          signature_url?: string | null
          site_id?: string | null
          statut?: Database["public"]["Enums"]["devis_statut"]
          token_public?: string | null
          total_ht_cents?: number
          total_ttc_cents?: number
          updated_at?: string
          validite_jusqu?: string | null
        }
        Update: {
          accepte_le?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          numero?: string | null
          organisation_id?: string
          signature_url?: string | null
          site_id?: string | null
          statut?: Database["public"]["Enums"]["devis_statut"]
          token_public?: string | null
          total_ht_cents?: number
          total_ttc_cents?: number
          updated_at?: string
          validite_jusqu?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "devis_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["site_id"]
          },
        ]
      }
      devis_lignes: {
        Row: {
          designation: string
          devis_id: string
          id: string
          ordre: number
          organisation_id: string
          pu_ht_cents: number
          quantite: number
          tva_taux: number
        }
        Insert: {
          designation: string
          devis_id: string
          id?: string
          ordre?: number
          organisation_id: string
          pu_ht_cents?: number
          quantite?: number
          tva_taux?: number
        }
        Update: {
          designation?: string
          devis_id?: string
          id?: string
          ordre?: number
          organisation_id?: string
          pu_ht_cents?: number
          quantite?: number
          tva_taux?: number
        }
        Relationships: [
          {
            foreignKeyName: "devis_lignes_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_lignes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      exutoires: {
        Row: {
          adresse: string | null
          contact_responsable: string | null
          created_at: string
          created_by: string | null
          geom: unknown
          id: string
          organisation_id: string
          raison_sociale: string
          siret: string | null
          tarif_depotage_m3_cents: number | null
          type: Database["public"]["Enums"]["exutoire_type"]
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          contact_responsable?: string | null
          created_at?: string
          created_by?: string | null
          geom?: unknown
          id?: string
          organisation_id: string
          raison_sociale: string
          siret?: string | null
          tarif_depotage_m3_cents?: number | null
          type?: Database["public"]["Enums"]["exutoire_type"]
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          contact_responsable?: string | null
          created_at?: string
          created_by?: string | null
          geom?: unknown
          id?: string
          organisation_id?: string
          raison_sociale?: string
          siret?: string | null
          tarif_depotage_m3_cents?: number | null
          type?: Database["public"]["Enums"]["exutoire_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exutoires_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      facture_lignes: {
        Row: {
          designation: string
          facture_id: string
          id: string
          ordre: number
          organisation_id: string
          pu_ht_cents: number
          quantite: number
          tva_taux: number
        }
        Insert: {
          designation: string
          facture_id: string
          id?: string
          ordre?: number
          organisation_id: string
          pu_ht_cents?: number
          quantite?: number
          tva_taux?: number
        }
        Update: {
          designation?: string
          facture_id?: string
          id?: string
          ordre?: number
          organisation_id?: string
          pu_ht_cents?: number
          quantite?: number
          tva_taux?: number
        }
        Relationships: [
          {
            foreignKeyName: "facture_lignes_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facture_lignes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          echeance: string | null
          emise_le: string | null
          facture_origine_id: string | null
          id: string
          intervention_id: string | null
          kind: Database["public"]["Enums"]["facture_kind"]
          motif_avoir: string | null
          numero: string | null
          organisation_id: string
          pdf_sha256: string | null
          pdf_url: string | null
          statut: Database["public"]["Enums"]["facture_statut"]
          total_ht_cents: number
          total_ttc_cents: number
          total_tva_cents: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          echeance?: string | null
          emise_le?: string | null
          facture_origine_id?: string | null
          id?: string
          intervention_id?: string | null
          kind?: Database["public"]["Enums"]["facture_kind"]
          motif_avoir?: string | null
          numero?: string | null
          organisation_id: string
          pdf_sha256?: string | null
          pdf_url?: string | null
          statut?: Database["public"]["Enums"]["facture_statut"]
          total_ht_cents?: number
          total_ttc_cents?: number
          total_tva_cents?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          echeance?: string | null
          emise_le?: string | null
          facture_origine_id?: string | null
          id?: string
          intervention_id?: string | null
          kind?: Database["public"]["Enums"]["facture_kind"]
          motif_avoir?: string | null
          numero?: string | null
          organisation_id?: string
          pdf_sha256?: string | null
          pdf_url?: string | null
          statut?: Database["public"]["Enums"]["facture_statut"]
          total_ht_cents?: number
          total_ttc_cents?: number
          total_tva_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "factures_facture_origine_id_fkey"
            columns: ["facture_origine_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_planning_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_events: {
        Row: {
          at: string
          client_event_uuid: string | null
          gps: unknown
          id: string
          intervention_id: string
          organisation_id: string
          payload: Json
          status_from: Database["public"]["Enums"]["intervention_status"] | null
          status_to: Database["public"]["Enums"]["intervention_status"] | null
          type: string
        }
        Insert: {
          at?: string
          client_event_uuid?: string | null
          gps?: unknown
          id?: string
          intervention_id: string
          organisation_id: string
          payload?: Json
          status_from?:
            | Database["public"]["Enums"]["intervention_status"]
            | null
          status_to?: Database["public"]["Enums"]["intervention_status"] | null
          type: string
        }
        Update: {
          at?: string
          client_event_uuid?: string | null
          gps?: unknown
          id?: string
          intervention_id?: string
          organisation_id?: string
          payload?: Json
          status_from?:
            | Database["public"]["Enums"]["intervention_status"]
            | null
          status_to?: Database["public"]["Enums"]["intervention_status"] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_events_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_events_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_planning_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_events_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_ouvrages: {
        Row: {
          classification_dechet: Database["public"]["Enums"]["dechet_classification"]
          created_at: string
          id: string
          intervention_id: string
          observations: string | null
          organisation_id: string
          ouvrage_id: string | null
          prochaine_vidange_conseillee: string | null
          recommandations: Json
          volume_pompe_m3: number | null
        }
        Insert: {
          classification_dechet?: Database["public"]["Enums"]["dechet_classification"]
          created_at?: string
          id?: string
          intervention_id: string
          observations?: string | null
          organisation_id: string
          ouvrage_id?: string | null
          prochaine_vidange_conseillee?: string | null
          recommandations?: Json
          volume_pompe_m3?: number | null
        }
        Update: {
          classification_dechet?: Database["public"]["Enums"]["dechet_classification"]
          created_at?: string
          id?: string
          intervention_id?: string
          observations?: string | null
          organisation_id?: string
          ouvrage_id?: string | null
          prochaine_vidange_conseillee?: string | null
          recommandations?: Json
          volume_pompe_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_ouvrages_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_ouvrages_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "v_planning_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_ouvrages_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_ouvrages_ouvrage_id_fkey"
            columns: ["ouvrage_id"]
            isOneToOne: false
            referencedRelation: "ouvrages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_ouvrages_ouvrage_id_fkey"
            columns: ["ouvrage_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions: {
        Row: {
          camion_id: string | null
          chauffeur_id: string | null
          client_absent: boolean
          commande_id: string | null
          created_at: string
          created_by: string | null
          date_prevue: string | null
          demarree_a: string | null
          duree_estimee_min: number | null
          fenetre: Database["public"]["Enums"]["fenetre_horaire"] | null
          gps_arrivee: unknown
          heure_precise: string | null
          id: string
          motif_annulation: string | null
          motif_impossible: string | null
          ordre_passage: number | null
          organisation_id: string
          signataire_nom: string | null
          signature_client_url: string | null
          site_id: string
          status: Database["public"]["Enums"]["intervention_status"]
          terminee_a: string | null
          tournee_id: string | null
          updated_at: string
          urgence: boolean
        }
        Insert: {
          camion_id?: string | null
          chauffeur_id?: string | null
          client_absent?: boolean
          commande_id?: string | null
          created_at?: string
          created_by?: string | null
          date_prevue?: string | null
          demarree_a?: string | null
          duree_estimee_min?: number | null
          fenetre?: Database["public"]["Enums"]["fenetre_horaire"] | null
          gps_arrivee?: unknown
          heure_precise?: string | null
          id?: string
          motif_annulation?: string | null
          motif_impossible?: string | null
          ordre_passage?: number | null
          organisation_id: string
          signataire_nom?: string | null
          signature_client_url?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["intervention_status"]
          terminee_a?: string | null
          tournee_id?: string | null
          updated_at?: string
          urgence?: boolean
        }
        Update: {
          camion_id?: string | null
          chauffeur_id?: string | null
          client_absent?: boolean
          commande_id?: string | null
          created_at?: string
          created_by?: string | null
          date_prevue?: string | null
          demarree_a?: string | null
          duree_estimee_min?: number | null
          fenetre?: Database["public"]["Enums"]["fenetre_horaire"] | null
          gps_arrivee?: unknown
          heure_precise?: string | null
          id?: string
          motif_annulation?: string | null
          motif_impossible?: string | null
          ordre_passage?: number | null
          organisation_id?: string
          signataire_nom?: string | null
          signature_client_url?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["intervention_status"]
          terminee_a?: string | null
          tournee_id?: string | null
          updated_at?: string
          urgence?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "interventions_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "interventions_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_outbox: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          organisation_id: string | null
          payload: Json
          retries: number
          run_after: string
          statut: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          organisation_id?: string | null
          payload?: Json
          retries?: number
          run_after?: string
          statut?: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          organisation_id?: string | null
          payload?: Json
          retries?: number
          run_after?: string
          statut?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_outbox_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          canal: string
          created_at: string
          destinataire_user_id: string | null
          id: string
          lien_id: string | null
          lien_type: string | null
          lu: boolean
          message: string
          organisation_id: string
          type: string
        }
        Insert: {
          canal?: string
          created_at?: string
          destinataire_user_id?: string | null
          id?: string
          lien_id?: string | null
          lien_type?: string | null
          lu?: boolean
          message: string
          organisation_id: string
          type: string
        }
        Update: {
          canal?: string
          created_at?: string
          destinataire_user_id?: string | null
          id?: string
          lien_id?: string | null
          lien_type?: string | null
          lu?: boolean
          message?: string
          organisation_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_destinataire_user_id_fkey"
            columns: ["destinataire_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          abonnement: Json
          adresse: string | null
          created_at: string
          id: string
          logo_url: string | null
          parametres: Json
          raison_sociale: string
          siret: string | null
          updated_at: string
        }
        Insert: {
          abonnement?: Json
          adresse?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          parametres?: Json
          raison_sociale: string
          siret?: string | null
          updated_at?: string
        }
        Update: {
          abonnement?: Json
          adresse?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          parametres?: Json
          raison_sociale?: string
          siret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ouvrages: {
        Row: {
          actif: boolean
          classification_dechet: Database["public"]["Enums"]["dechet_classification"]
          created_at: string
          created_by: string | null
          date_derniere_intervention: string | null
          date_pose: string | null
          date_prochaine_echeance: string | null
          id: string
          localisation: string | null
          organisation_id: string
          periodicite_mois: number | null
          photo_repere_url: string | null
          site_id: string
          type: Database["public"]["Enums"]["ouvrage_type"]
          updated_at: string
          volume_nominal_litres: number | null
        }
        Insert: {
          actif?: boolean
          classification_dechet?: Database["public"]["Enums"]["dechet_classification"]
          created_at?: string
          created_by?: string | null
          date_derniere_intervention?: string | null
          date_pose?: string | null
          date_prochaine_echeance?: string | null
          id?: string
          localisation?: string | null
          organisation_id: string
          periodicite_mois?: number | null
          photo_repere_url?: string | null
          site_id: string
          type: Database["public"]["Enums"]["ouvrage_type"]
          updated_at?: string
          volume_nominal_litres?: number | null
        }
        Update: {
          actif?: boolean
          classification_dechet?: Database["public"]["Enums"]["dechet_classification"]
          created_at?: string
          created_by?: string | null
          date_derniere_intervention?: string | null
          date_pose?: string | null
          date_prochaine_echeance?: string | null
          id?: string
          localisation?: string | null
          organisation_id?: string
          periodicite_mois?: number | null
          photo_repere_url?: string | null
          site_id?: string
          type?: Database["public"]["Enums"]["ouvrage_type"]
          updated_at?: string
          volume_nominal_litres?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ouvrages_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ouvrages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ouvrages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["site_id"]
          },
        ]
      }
      paiements: {
        Row: {
          created_by: string | null
          facture_id: string
          id: string
          mode: Database["public"]["Enums"]["paiement_mode"]
          montant_cents: number
          organisation_id: string
          rapproche: boolean
          recu_le: string
          reference: string | null
          stripe_payment_intent: string | null
        }
        Insert: {
          created_by?: string | null
          facture_id: string
          id?: string
          mode: Database["public"]["Enums"]["paiement_mode"]
          montant_cents: number
          organisation_id: string
          rapproche?: boolean
          recu_le?: string
          reference?: string | null
          stripe_payment_intent?: string | null
        }
        Update: {
          created_by?: string | null
          facture_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["paiement_mode"]
          montant_cents?: number
          organisation_id?: string
          rapproche?: boolean
          recu_le?: string
          reference?: string | null
          stripe_payment_intent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      plages_numeros: {
        Row: {
          camion_id: string
          consommes: number[]
          created_at: string
          debut: number
          fin: number
          id: string
          jour: string
          organisation_id: string
          type_doc: string
        }
        Insert: {
          camion_id: string
          consommes?: number[]
          created_at?: string
          debut: number
          fin: number
          id?: string
          jour: string
          organisation_id: string
          type_doc?: string
        }
        Update: {
          camion_id?: string
          consommes?: number[]
          created_at?: string
          debut?: number
          fin?: number
          id?: string
          jour?: string
          organisation_id?: string
          type_doc?: string
        }
        Relationships: [
          {
            foreignKeyName: "plages_numeros_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plages_numeros_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      prestations: {
        Row: {
          actif: boolean
          classification_dechet: Database["public"]["Enums"]["dechet_classification"]
          created_at: string
          created_by: string | null
          duree_standard_min: number
          id: string
          libelle: string
          majoration_urgence_pct: number
          majoration_weekend_pct: number
          ordre: number
          organisation_id: string
          prix_base_cents: number
          prix_m3_supplementaire_cents: number | null
          tva_taux: number
          updated_at: string
          volume_forfait_m3: number | null
        }
        Insert: {
          actif?: boolean
          classification_dechet?: Database["public"]["Enums"]["dechet_classification"]
          created_at?: string
          created_by?: string | null
          duree_standard_min?: number
          id?: string
          libelle: string
          majoration_urgence_pct?: number
          majoration_weekend_pct?: number
          ordre?: number
          organisation_id: string
          prix_base_cents?: number
          prix_m3_supplementaire_cents?: number | null
          tva_taux?: number
          updated_at?: string
          volume_forfait_m3?: number | null
        }
        Update: {
          actif?: boolean
          classification_dechet?: Database["public"]["Enums"]["dechet_classification"]
          created_at?: string
          created_by?: string | null
          duree_standard_min?: number
          id?: string
          libelle?: string
          majoration_urgence_pct?: number
          majoration_weekend_pct?: number
          ordre?: number
          organisation_id?: string
          prix_base_cents?: number
          prix_m3_supplementaire_cents?: number | null
          tva_taux?: number
          updated_at?: string
          volume_forfait_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prestations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      relances: {
        Row: {
          canal: Database["public"]["Enums"]["canal_contact"] | null
          cible_id: string | null
          cible_type: string | null
          client_id: string | null
          created_at: string
          envoye_le: string | null
          id: string
          organisation_id: string
          planifie_le: string | null
          statut: string
          type: string
        }
        Insert: {
          canal?: Database["public"]["Enums"]["canal_contact"] | null
          cible_id?: string | null
          cible_type?: string | null
          client_id?: string | null
          created_at?: string
          envoye_le?: string | null
          id?: string
          organisation_id: string
          planifie_le?: string | null
          statut?: string
          type: string
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_contact"] | null
          cible_id?: string | null
          cible_type?: string | null
          client_id?: string | null
          created_at?: string
          envoye_le?: string | null
          id?: string
          organisation_id?: string
          planifie_le?: string | null
          statut?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "relances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relances_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "relances_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          adresse: string
          client_id: string
          contact_sur_place: string | null
          created_at: string
          created_by: string | null
          distance_pompage_m: number | null
          geom: unknown
          id: string
          instructions_acces: string | null
          organisation_id: string
          updated_at: string
        }
        Insert: {
          adresse: string
          client_id: string
          contact_sur_place?: string | null
          created_at?: string
          created_by?: string | null
          distance_pompage_m?: number | null
          geom?: unknown
          id?: string
          instructions_acces?: string | null
          organisation_id: string
          updated_at?: string
        }
        Update: {
          adresse?: string
          client_id?: string
          contact_sur_place?: string | null
          created_at?: string
          created_by?: string | null
          distance_pompage_m?: number | null
          geom?: unknown
          id?: string
          instructions_acces?: string | null
          organisation_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "sites_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      taches: {
        Row: {
          assignee_user_id: string | null
          created_at: string
          echeance: string | null
          id: string
          libelle: string
          lien_id: string | null
          lien_type: string | null
          organisation_id: string
          statut: string
          type: string
          updated_at: string
        }
        Insert: {
          assignee_user_id?: string | null
          created_at?: string
          echeance?: string | null
          id?: string
          libelle: string
          lien_id?: string | null
          lien_type?: string | null
          organisation_id: string
          statut?: string
          type: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string | null
          created_at?: string
          echeance?: string | null
          id?: string
          libelle?: string
          lien_id?: string | null
          lien_type?: string | null
          organisation_id?: string
          statut?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taches_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taches_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      tournees: {
        Row: {
          camion_id: string
          chauffeur_id: string | null
          created_at: string
          created_by: string | null
          date_tournee: string
          id: string
          organisation_id: string
          statut: Database["public"]["Enums"]["tournee_statut"]
          updated_at: string
        }
        Insert: {
          camion_id: string
          chauffeur_id?: string | null
          created_at?: string
          created_by?: string | null
          date_tournee: string
          id?: string
          organisation_id: string
          statut?: Database["public"]["Enums"]["tournee_statut"]
          updated_at?: string
        }
        Update: {
          camion_id?: string
          chauffeur_id?: string | null
          created_at?: string
          created_by?: string | null
          date_tournee?: string
          id?: string
          organisation_id?: string
          statut?: Database["public"]["Enums"]["tournee_statut"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournees_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_chauffeur_id_fkey"
            columns: ["chauffeur_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournees_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      v_planning_interventions: {
        Row: {
          camion_id: string | null
          client_nom: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          date_prevue: string | null
          duree_min: number | null
          fenetre: Database["public"]["Enums"]["fenetre_horaire"] | null
          heure_precise: string | null
          id: string | null
          ordre_passage: number | null
          organisation_id: string | null
          ouvrage_type: Database["public"]["Enums"]["ouvrage_type"] | null
          prestation_label: string | null
          site_adresse: string | null
          site_id: string | null
          status: Database["public"]["Enums"]["intervention_status"] | null
          tournee_id: string | null
          urgence: boolean | null
          volume_estime_m3: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_camion_id_fkey"
            columns: ["camion_id"]
            isOneToOne: false
            referencedRelation: "camions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "v_recurrence_ouvrages"
            referencedColumns: ["site_id"]
          },
          {
            foreignKeyName: "interventions_tournee_id_fkey"
            columns: ["tournee_id"]
            isOneToOne: false
            referencedRelation: "tournees"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recurrence_ouvrages: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_nom: string | null
          client_telephone: string | null
          date_derniere_intervention: string | null
          date_prochaine_echeance: string | null
          id: string | null
          organisation_id: string | null
          relance_active: boolean | null
          site_adresse: string | null
          site_id: string | null
          type: Database["public"]["Enums"]["ouvrage_type"] | null
          volume_m3: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ouvrages_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      current_app_role: { Args: never; Returns: string }
      current_org_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      prochain_numero: {
        Args: { p_annee: number; p_org: string; p_type: string }
        Returns: number
      }
      reserver_numero: {
        Args: {
          p_annee: number
          p_org: string
          p_prefix: string
          p_type: string
        }
        Returns: string
      }
      rpc_affecter_intervention: {
        Args: { p_camion_id: string; p_date: string; p_intervention_id: string }
        Returns: undefined
      }
      rpc_clore_intervention: {
        Args: {
          p_exutoire_id?: string
          p_intervention_id: string
          p_quantite_m3?: number
        }
        Returns: Json
      }
      rpc_creer_client_site: {
        Args: {
          p_adresse: string
          p_email: string
          p_lat: number
          p_lng: number
          p_nom: string
          p_telephone: string
          p_type: Database["public"]["Enums"]["client_type"]
        }
        Returns: string
      }
      rpc_creer_ouvrage: {
        Args: {
          p_date_derniere?: string
          p_localisation?: string
          p_periodicite_mois?: number
          p_site_id: string
          p_type: Database["public"]["Enums"]["ouvrage_type"]
          p_volume?: number
        }
        Returns: string
      }
      rpc_creer_relance_recurrence: {
        Args: {
          p_canal?: Database["public"]["Enums"]["canal_contact"]
          p_ouvrage_id: string
        }
        Returns: string
      }
      rpc_creer_site: {
        Args: {
          p_adresse: string
          p_client_id: string
          p_instructions_acces?: string
          p_lat?: number
          p_lng?: number
        }
        Returns: string
      }
      rpc_deplacer_intervention: {
        Args: { p_intervention_id: string; p_sens: number }
        Returns: undefined
      }
      rpc_desaffecter_intervention: {
        Args: { p_intervention_id: string }
        Returns: undefined
      }
      rpc_enregistrer_paiement: {
        Args: {
          p_facture_id: string
          p_mode: Database["public"]["Enums"]["paiement_mode"]
          p_montant_cents: number
          p_reference?: string
          p_stripe_payment_intent?: string
        }
        Returns: Json
      }
      rpc_facturer_intervention: {
        Args: { p_intervention_id: string }
        Returns: Json
      }
      rpc_marquer_relance: {
        Args: { p_relance_id: string; p_statut: string }
        Returns: undefined
      }
      rpc_modifier_ouvrage: {
        Args: {
          p_date_derniere?: string
          p_localisation?: string
          p_ouvrage_id: string
          p_periodicite_mois?: number
          p_type: Database["public"]["Enums"]["ouvrage_type"]
          p_volume?: number
        }
        Returns: undefined
      }
      rpc_modifier_site: {
        Args: {
          p_adresse: string
          p_instructions_acces?: string
          p_lat?: number
          p_lng?: number
          p_site_id: string
        }
        Returns: undefined
      }
      rpc_supprimer_ouvrage: {
        Args: { p_ouvrage_id: string }
        Returns: undefined
      }
      rpc_supprimer_site: { Args: { p_site_id: string }; Returns: undefined }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      uuid_generate_v7: { Args: never; Returns: string }
    }
    Enums: {
      agrement_statut: "actif" | "en_renouvellement" | "expire" | "suspendu"
      app_role: "admin" | "exploitation" | "chauffeur" | "comptable" | "client"
      bordereau_statut: "EMIS" | "SIGNE_CLIENT" | "DEPOSE" | "BOUCLE" | "ANNULE"
      bordereau_type: "BSMV" | "BSDD" | "BON_PRESTATION"
      camion_type: "hydrocureur" | "combine" | "citerne_simple" | "fourgon"
      canal_contact: "sms" | "email" | "telephone"
      client_type: "particulier" | "professionnel" | "collectivite" | "syndic"
      dechet_classification:
        | "MATIERES_VIDANGE_ANC"
        | "DECHET_DANGEREUX"
        | "DECHET_NON_DANGEREUX_HORS_ANC"
      devis_statut: "brouillon" | "envoye" | "accepte" | "refuse" | "expire"
      exutoire_type:
        | "station_epuration"
        | "centre_agree"
        | "epandage_autorise"
        | "autre"
      facture_kind: "facture" | "avoir"
      facture_statut:
        | "brouillon"
        | "emise"
        | "envoyee"
        | "payee"
        | "partiellement_payee"
        | "en_retard"
        | "irrecouvrable"
      fenetre_horaire: "matin" | "apres_midi" | "precis"
      intervention_status:
        | "BROUILLON"
        | "PLANIFIEE"
        | "EN_ROUTE"
        | "SUR_SITE"
        | "TERMINEE"
        | "IMPOSSIBLE"
        | "CLOTUREE"
        | "ANNULEE"
      ouvrage_type:
        | "FOSSE_SEPTIQUE"
        | "FOSSE_TOUTES_EAUX"
        | "MICRO_STATION"
        | "BAC_A_GRAISSE"
        | "SEPARATEUR_HYDROCARBURES"
        | "POSTE_RELEVAGE"
        | "CUVE_FIOUL"
        | "CANALISATION"
        | "AUTRE"
      paiement_mode: "cb" | "lien_sms" | "virement" | "cheque" | "especes"
      signataire_role: "proprietaire" | "vidangeur" | "filiere"
      tournee_statut: "planifiee" | "en_cours" | "cloturee"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agrement_statut: ["actif", "en_renouvellement", "expire", "suspendu"],
      app_role: ["admin", "exploitation", "chauffeur", "comptable", "client"],
      bordereau_statut: ["EMIS", "SIGNE_CLIENT", "DEPOSE", "BOUCLE", "ANNULE"],
      bordereau_type: ["BSMV", "BSDD", "BON_PRESTATION"],
      camion_type: ["hydrocureur", "combine", "citerne_simple", "fourgon"],
      canal_contact: ["sms", "email", "telephone"],
      client_type: ["particulier", "professionnel", "collectivite", "syndic"],
      dechet_classification: [
        "MATIERES_VIDANGE_ANC",
        "DECHET_DANGEREUX",
        "DECHET_NON_DANGEREUX_HORS_ANC",
      ],
      devis_statut: ["brouillon", "envoye", "accepte", "refuse", "expire"],
      exutoire_type: [
        "station_epuration",
        "centre_agree",
        "epandage_autorise",
        "autre",
      ],
      facture_kind: ["facture", "avoir"],
      facture_statut: [
        "brouillon",
        "emise",
        "envoyee",
        "payee",
        "partiellement_payee",
        "en_retard",
        "irrecouvrable",
      ],
      fenetre_horaire: ["matin", "apres_midi", "precis"],
      intervention_status: [
        "BROUILLON",
        "PLANIFIEE",
        "EN_ROUTE",
        "SUR_SITE",
        "TERMINEE",
        "IMPOSSIBLE",
        "CLOTUREE",
        "ANNULEE",
      ],
      ouvrage_type: [
        "FOSSE_SEPTIQUE",
        "FOSSE_TOUTES_EAUX",
        "MICRO_STATION",
        "BAC_A_GRAISSE",
        "SEPARATEUR_HYDROCARBURES",
        "POSTE_RELEVAGE",
        "CUVE_FIOUL",
        "CANALISATION",
        "AUTRE",
      ],
      paiement_mode: ["cb", "lien_sms", "virement", "cheque", "especes"],
      signataire_role: ["proprietaire", "vidangeur", "filiere"],
      tournee_statut: ["planifiee", "en_cours", "cloturee"],
    },
  },
} as const
