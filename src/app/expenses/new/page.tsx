
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Timestamp, doc, getDoc, serverTimestamp, addDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import type { Project } from '@/data/mock-data';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { User as AppUserType } from '@/data/mock-data';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from '@/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { tagExpense, type TagExpenseOutput } from '@/ai/flows/tag-expense-with-ai';
import { convertToEur, type CurrencyConversionResult } from '@/services/currency-converter';

const currencies = ["EUR", "USD", "GBP", "CZK", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "BRL", "RUB", "ZAR"];

const expenseFormSchema = z.object({
  description: z.string().min(3, { message: "La description doit comporter au moins 3 caractères." }).max(100, { message: "La description ne doit pas dépasser 100 caractères." }),
  amount: z.coerce.number().positive({ message: "Le montant doit être un nombre positif." }),
  currency: z.string().min(1, { message: "Veuillez sélectionner une devise."}).default("EUR"),
  projectId: z.string().min(1, { message: "Veuillez sélectionner un projet." }),
  paidById: z.string().min(1, { message: "Veuillez sélectionner qui a payé." }),
  expenseDate: z.date({
    required_error: "Veuillez sélectionner une date.",
  }),
  category: z.string().optional(),
  invoiceForAnalysis: z.instanceof(File).optional(),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const getAvatarFallbackText = (name?: string | null, email?: string | null): string => {
  if (name && name.trim() !== '') {
    const parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[parts.length - 1]) {
      return (parts[0][0] || '').toUpperCase() + (parts[parts.length - 1][0] || '').toUpperCase();
    }
    const singleName = parts[0];
    if (singleName && singleName.length >= 2) {
      return singleName.substring(0, 2).toUpperCase();
    }
    if (singleName && singleName.length === 1) {
      return singleName[0].toUpperCase();
    }
  }
  if (email && email.trim() !== '') {
    const emailPrefix = email.split('@')[0];
    if (emailPrefix && emailPrefix.length >= 2) {
      return emailPrefix.substring(0, 2).toUpperCase();
    }
    if (emailPrefix && emailPrefix.length === 1) {
      return emailPrefix[0].toUpperCase();
    }
  }
  return '??';
};


export default function NewExpensePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, userProfile, loading: authLoading, logout } = useAuth();
  

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [usersForDropdown, setUsersForDropdown] = useState<AppUserType[]>([]);
  const [isLoadingUsersForDropdown, setIsLoadingUsersForDropdown] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  const isMobile = useIsMobile();
  const [showCamera, setShowCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);


  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: undefined,
      currency: 'EUR',
      projectId: '',
      paidById: '',
      expenseDate: new Date(),
      category: '',
      invoiceForAnalysis: undefined,
    },
  });

  const watchedProjectId = form.watch('projectId');
  const watchedDescription = form.watch('description');

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);


  useEffect(() => {
    console.log("[NewExpensePage useEffect paidById] Initializing paidById. CurrentUser:", !!currentUser, "Form paidById:", form.getValues('paidById'));
    if (currentUser && !form.getValues('paidById')) {
      form.reset({
        ...form.getValues(),
        paidById: currentUser.uid,
        amount: form.getValues('amount') || undefined, 
        description: form.getValues('description') || '',
        currency: form.getValues('currency') || 'EUR',
        projectId: form.getValues('projectId') || '',
        expenseDate: form.getValues('expenseDate') || new Date(),
        category: form.getValues('category') || '',
        invoiceForAnalysis: undefined, 
      });
      console.log("[NewExpensePage useEffect paidById] Set paidById to currentUser.uid:", currentUser.uid);
    }
  }, [currentUser, form, authLoading]);

  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingProjects(true);
    try {
      const projectsCollection = collection(db, "projects");
      const memberQuery = query(projectsCollection, where("members", "array-contains", currentUser.uid));
      const ownerQuery = query(projectsCollection, where("ownerId", "==", currentUser.uid));

      const [memberSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(memberQuery),
        getDocs(ownerQuery)
      ]);

      const projectsMap = new Map<string, Project>();
      memberSnapshot.docs.forEach(docSnap => projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Project));
      ownerSnapshot.docs.forEach(docSnap => projectsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Project));

      const projectsList = Array.from(projectsMap.values());
      setProjects(projectsList);

    } catch (error) {
      console.error("Erreur lors de la récupération des projets: ", error);
      toast({
        title: "Erreur de chargement",
        description: "Impossible de charger la liste des projets.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if(currentUser){
      fetchProjects();
    }
  }, [currentUser, fetchProjects]);

  useEffect(() => {
    console.log("[NewExpensePage useEffect paidById] Watched projectId:", watchedProjectId, ". CurrentUser:", !!currentUser, ", UserProfile:", !!userProfile);
    const fetchProjectMembersAndSetDropdown = async (projectId: string) => {
      console.log("[NewExpensePage useEffect paidById] Fetching members for projectId:", projectId);
      if (!currentUser || !projectId) {
        const defaultUserArray = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
        setUsersForDropdown(defaultUserArray);
        if (currentUser && defaultUserArray.length > 0 && defaultUserArray[0]?.id && !form.getValues('paidById')) {
             form.setValue('paidById', currentUser.uid);
        }
        setIsLoadingUsersForDropdown(false);
        return;
      }
      setIsLoadingUsersForDropdown(true);
      try {
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);

        let fetchedProjectMembers: AppUserType[] = [];
        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as Project;
          console.log(`[NewExpensePage useEffect paidById] Project "${projectData.name}" members UIDs:`, projectData.members);

          if (projectData.members && projectData.members.length > 0) {
            const userPromises = projectData.members.map(uid => getDoc(doc(db, "users", uid)));
            const userDocs = await Promise.all(userPromises);
            fetchedProjectMembers = userDocs
              .filter(d => {
                if (!d.exists()) console.warn(`[NewExpensePage useEffect paidById] User document for UID ${d.id} not found.`);
                return d.exists();
              })
              .map(d => ({ id: d.id, ...d.data() } as AppUserType));
             console.log(`[NewExpensePage useEffect paidById] Fetched profiles for project members:`, fetchedProjectMembers.map(u => ({id: u.id, name: u.name})));
          }
        } else {
          toast({ title: "Erreur", description: "Projet non trouvé pour charger les membres payeurs.", variant: "destructive" });
           console.warn(`[NewExpensePage useEffect paidById] Project document with ID ${projectId} not found.`);
        }
        setUsersForDropdown(fetchedProjectMembers);

        const currentPaidById = form.getValues('paidById');
        const currentUserIsAmongFetched = fetchedProjectMembers.some(u => u.id === currentUser?.uid);

        if (!currentPaidById || !fetchedProjectMembers.some(u => u.id === currentPaidById)) {
            if (currentUserIsAmongFetched && currentUser) {
                form.setValue('paidById', currentUser.uid);
            } else if (fetchedProjectMembers.length > 0 && fetchedProjectMembers[0]?.id) {
                form.setValue('paidById', fetchedProjectMembers[0].id);
            } else if (currentUser) {
                 form.setValue('paidById', currentUser.uid);
            } else {
                form.setValue('paidById', '');
            }
        }

      } catch (error) {
        console.error("[NewExpensePage useEffect paidById] Erreur lors de la récupération des membres du projet pour la liste 'Payé par': ", error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les membres du projet pour la sélection du payeur.",
          variant: "destructive",
        });
        const defaultUserOnError = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
        setUsersForDropdown(defaultUserOnError);
         if (currentUser && defaultUserOnError.length > 0 && defaultUserOnError[0]?.id && !form.getValues('paidById')) {
            form.setValue('paidById', currentUser.uid);
        }
      } finally {
        setIsLoadingUsersForDropdown(false);
      }
    };
    
    if (watchedProjectId) {
      fetchProjectMembersAndSetDropdown(watchedProjectId);
    } else {
      const defaultUserArray = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
      setUsersForDropdown(defaultUserArray);
      if (currentUser && defaultUserArray.length > 0 && defaultUserArray[0]?.id && !form.getValues('paidById')) {
         form.setValue('paidById', currentUser.uid);
      }
      setIsLoadingUsersForDropdown(false);
    }

  }, [watchedProjectId, currentUser, userProfile, toast, form]);


  const performInvoiceAnalysis = async (base64Image: string, fileType: string) => {
    setIsAnalyzing(true);
    try {
        const response = await fetch('/api/extract-invoice-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image, fileType }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || `Erreur HTTP: ${response.status}`);
        }
        const data = await response.json();
        console.log("[NewExpensePage performInvoiceAnalysis] Data from API:", data);

        form.setValue('description', data.nom_fournisseur || data.nom_client || "Facture analysée");

        let amountValue: number | undefined = undefined;
        let currencyValue = "EUR"; 

        if (data.montant_total_ttc) {
            if (typeof data.montant_total_ttc === 'number') {
                amountValue = data.montant_total_ttc;
            } else if (typeof data.montant_total_ttc === 'string') {
                const amountString = data.montant_total_ttc.replace(',', '.'); 
                const numericMatch = amountString.match(/[\d.]+/);
                if (numericMatch && numericMatch[0]) {
                    amountValue = parseFloat(numericMatch[0]);
                }

                const currencyMatch = amountString.match(/(EUR|USD|GBP|CZK|JPY|CAD|AUD|CHF|CNY|INR|BRL|RUB|ZAR)/i);
                if (currencyMatch && currencyMatch[0]) {
                    const foundCurrency = currencyMatch[0].toUpperCase();
                    if (currencies.includes(foundCurrency)) { 
                        currencyValue = foundCurrency;
                    }
                }
            }
        }
        form.setValue('amount', amountValue);
        form.setValue('currency', currencyValue);


        if (data.date_facture) {
          try {
            const parsedDate = parseISO(data.date_facture); 
            form.setValue('expenseDate', parsedDate);
          } catch (dateError) {
            console.error("Erreur de parsing de la date de la facture:", dateError);
            toast({ title: "Avertissement", description: "Format de date de facture non reconnu. Veuillez vérifier la date."});
          }
        }
        toast({ title: "Analyse réussie", description: "Les champs ont été pré-remplis." });
    } catch (error: any) {
        console.error("Erreur lors de l'analyse de la facture:", error);
        toast({ title: "Erreur d'analyse", description: error.message || "Impossible d'analyser la facture.", variant: "destructive" });
    } finally {
        setIsAnalyzing(false);
    }
  };


  const handleAnalyzeUploadedFile = async () => {
    if (!invoiceFile) {
      toast({ title: "Aucun fichier", description: "Veuillez sélectionner un fichier de facture à analyser.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(invoiceFile);
    reader.onloadend = async () => {
        const base64Image = reader.result as string;
        const fileType = invoiceFile.type;
        await performInvoiceAnalysis(base64Image, fileType);
    };
    reader.onerror = () => {
        toast({ title: "Erreur de lecture", description: "Impossible de lire le fichier sélectionné.", variant: "destructive" });
        setIsAnalyzing(false);
    };
  };

const handleOpenCamera = async () => {
    setShowCamera(true);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            let stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } });
            setHasCameraPermission(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setAvailableCameras(videoDevices);
            if (videoDevices.length > 0) {
                const currentTrack = stream.getVideoTracks()[0];
                const currentDeviceId = currentTrack?.getSettings().deviceId;
                const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
                setCurrentCameraIndex(currentIndex !== -1 ? currentIndex : 0);
            } else {
                setCurrentCameraIndex(0);
            }
        } catch (error) {
            console.warn("Could not get environment camera, trying default/user camera:", error);
            try {
                let stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                setAvailableCameras(videoDevices);
                if (videoDevices.length > 0) {
                    const currentTrack = stream.getVideoTracks()[0];
                    const currentDeviceId = currentTrack?.getSettings().deviceId;
                    const currentIndex = videoDevices.findIndex(device => device.deviceId === currentDeviceId);
                    setCurrentCameraIndex(currentIndex !== -1 ? currentIndex : 0);
                } else {
                    setCurrentCameraIndex(0);
                }
            } catch (finalError) {
                 console.error("Error accessing any camera:", finalError);
                 setHasCameraPermission(false);
                 toast({
                     variant: "destructive",
                     title: "Accès Caméra Refusé",
                     description: "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.",
                 });
                 setShowCamera(false);
            }
        }
    } else {
        setHasCameraPermission(false);
        toast({
            variant: "destructive",
            title: "Caméra non supportée",
            description: "Votre navigateur ne supporte pas l'accès à la caméra.",
        });
        setShowCamera(false);
    }
};

const handleSwitchCamera = async () => {
    if (availableCameras.length > 1 && videoRef.current) {
        const currentStream = videoRef.current.srcObject as MediaStream | null;
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }

        const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
        setCurrentCameraIndex(nextIndex);
        const nextCamera = availableCameras[nextIndex];

        if (nextCamera && nextCamera.deviceId) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: nextCamera.deviceId } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error("Error switching camera:", error);
                toast({
                    variant: "destructive",
                    title: "Erreur de changement de caméra",
                    description: "Impossible de basculer.",
                });
            }
        }
    }
};


  const handleCloseCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
    setAvailableCameras([]);
    setCurrentCameraIndex(0);
  };

  const handleCaptureAndAnalyze = async () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            
            const blob = await (await fetch(imageDataUrl)).blob();
            const capturedFile = new File([blob], `facture-scannee-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setInvoiceFile(capturedFile); 
            form.setValue('invoiceForAnalysis', capturedFile); 
            
            await performInvoiceAnalysis(imageDataUrl, 'image/jpeg');
        }
        handleCloseCamera();
    }
  };


  async function onSubmit(values: ExpenseFormValues) {
    console.log("[NewExpensePage onSubmit] Form values:", values);
    console.log("[NewExpensePage onSubmit] Current usersForDropdown state:", usersForDropdown);
    console.log("[NewExpensePage onSubmit] Current userProfile from context:", userProfile);
    console.log("[NewExpensePage onSubmit] Current currentUser from context:", currentUser);

    if (!currentUser || !userProfile) {
        toast({ title: "Utilisateur non connecté ou profil incomplet", description: "Veuillez vous connecter et vous assurer que votre profil est chargé.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    setIsSubmitting(true);

    const selectedProject = projects.find(p => p.id === values.projectId);
    const payerProfile = usersForDropdown.find(u => u.id === values.paidById);

    console.log("[NewExpensePage onSubmit] Selected Project:", selectedProject);
    console.log("[NewExpensePage onSubmit] Found Payer Profile (from usersForDropdown):", payerProfile);

    if (!selectedProject) {
        toast({ title: "Erreur de données", description: "Projet introuvable.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    if (!payerProfile) {
        toast({ title: "Erreur de données", description: `Payeur introuvable (ID: ${values.paidById}).`, variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    let amountInEur: number | null = values.amount; // Initialisé à null
    let conversionErrorMessage: string | undefined = undefined;

    if (values.currency !== "EUR") {
      toast({ title: "Conversion en cours", description: `Conversion de ${values.currency} en EUR...`});
      const conversionResult = await convertToEur(values.amount, values.currency);
      if (conversionResult.convertedAmountEUR !== null) {
        amountInEur = conversionResult.convertedAmountEUR;
        toast({ title: "Conversion réussie", description: `${values.amount} ${values.currency} = ${amountInEur.toFixed(2)} EUR`});
      } else {
        conversionErrorMessage = conversionResult.errorMessage || "La conversion de devise a échoué. La dépense sera enregistrée avec le montant original mais sans équivalent EUR.";
        toast({
          title: "Échec de la conversion",
          description: conversionErrorMessage,
          variant: "destructive",
          duration: 7000,
        });
        amountInEur = null;
      }
    } else {
        amountInEur = values.amount; // Si c'est déjà EUR, amountEUR est le même que amount
    }
    
    const newExpenseRef = doc(collection(db, "expenses")); 
    console.log("[NewExpensePage onSubmit Attempting to save expense to Firestore] Expense ID (for path):", newExpenseRef.id);


    try {
      const projectRef = doc(db, "projects", selectedProject.id);
      
      const newExpenseDocData = {
            id: newExpenseRef.id,
            title: values.description,
            amount: values.amount, 
            currency: values.currency, 
            amountEUR: amountInEur, 
            projectId: values.projectId,
            projectName: selectedProject.name,
            paidById: payerProfile.id,
            paidByName: payerProfile.name || payerProfile.email || "Nom Inconnu",
            expenseDate: Timestamp.fromDate(values.expenseDate),
            category: values.category || null,
            createdAt: serverTimestamp(),
            createdBy: currentUser.uid,
            updatedAt: serverTimestamp(),
        };
      console.log("[NewExpensePage onSubmit] Data to be saved to Firestore:", newExpenseDocData);
        
      await runTransaction(db, async (transaction) => {
        // 1. LIRE le document projet D'ABORD
        const projectDoc = await transaction.get(projectRef); 
        if (!projectDoc.exists()) {
          throw new Error("Le projet associé n'existe plus.");
        }
        const projectData = projectDoc.data() as Project;
        
        // 2. Préparer les données de mise à jour du projet
        const currentTotalExpenses = projectData.totalExpenses || 0;
        const expenseAmountForTotal = typeof amountInEur === 'number' ? amountInEur : 0; 
        if (isNaN(expenseAmountForTotal)) {
            console.error("[NewExpensePage onSubmit] expenseAmountForTotal is NaN. Original amount:", values.amount, "Converted amountEUR:", amountInEur);
            throw new Error("Montant de dépense invalide pour le calcul du total du projet après conversion.");
        }
        const newTotalExpenses = currentTotalExpenses + expenseAmountForTotal;

        const recentExpenseSummary = {
          id: newExpenseRef.id,
          name: values.description,
          date: Timestamp.fromDate(values.expenseDate),
          amount: values.amount, 
          currency: values.currency, 
          amountEUR: amountInEur, 
          payer: payerProfile.name || payerProfile.email || "Nom Inconnu",
        };
        
        const existingRecentExpenses = projectData.recentExpenses || [];
        let updatedRecentExpenses = [recentExpenseSummary, ...existingRecentExpenses]
                                     .sort((a, b) => b.date.toMillis() - a.date.toMillis()) 
                                     .slice(0, 5); 

        const projectUpdateData: Partial<Project> = {
            totalExpenses: newTotalExpenses < 0 ? 0 : newTotalExpenses,
            recentExpenses: updatedRecentExpenses,
            lastActivity: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        
        // 3. ÉCRIRE la nouvelle dépense
        transaction.set(newExpenseRef, newExpenseDocData); 
        // 4. ÉCRIRE la mise à jour du projet
        transaction.update(projectRef, projectUpdateData); 
      });


      toast({
        title: "Dépense ajoutée",
        description: `La dépense "${values.description}" a été enregistrée.`,
      });
      form.reset({
         description: '',
         amount: undefined, // Réinitialiser à undefined pour être cohérent
         currency: 'EUR',
         projectId: '', 
         paidById: currentUser?.uid || '',
         expenseDate: new Date(),
         category: '',
         invoiceForAnalysis: undefined,
      });
      setInvoiceFile(null);
      const defaultUserArrayReset = userProfile ? [userProfile] : (currentUser ? [{id: currentUser.uid, name: currentUser.displayName || currentUser.email || "Utilisateur Actuel", email: currentUser.email || "", isAdmin: false, avatarUrl: currentUser.photoURL || ''}] : []);
      setUsersForDropdown(defaultUserArrayReset);
      if (currentUser && defaultUserArrayReset.length > 0 && defaultUserArrayReset[0]?.id) {
        form.setValue('paidById', currentUser.uid);
      } else {
        form.setValue('paidById', '');
      }

      router.push('/expenses');
    } catch (error: any) {
        console.error("[NewExpensePage onSubmit] Erreur lors de l'ajout de la dépense (Firestore transaction): ", error.message, error);
        toast({
            title: "Erreur d'enregistrement Firestore",
            description: `Impossible d'enregistrer la dépense: ${error.message || "Veuillez réessayer."}`,
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast({ title: "Déconnexion réussie" });
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      toast({ title: "Erreur de déconnexion", variant: "destructive" });
    }
  };

  const handleSuggestCategory = async () => {
    const description = form.getValues("description");
    console.log("[NewExpensePage handleSuggestCategory] Description for AI:", description);
    if (!description || description.trim().length < 3) {
      toast({
        title: "Description manquante",
        description: "Veuillez entrer une description d'au moins 3 caractères pour suggérer une catégorie.",
        variant: "destructive"
      });
      return;
    }
    setIsSuggestingCategory(true);
    try {
      const suggestedCategoryOutput: TagExpenseOutput = await tagExpense({ description }); // Assurez-vous que TagExpenseOutput est le type correct
      console.log("[NewExpensePage handleSuggestCategory] Suggested category from AI:", suggestedCategoryOutput);
      
      const category = typeof suggestedCategoryOutput === 'string' ? suggestedCategoryOutput : "Non catégorisé";

      if (category && category.trim() !== "") {
        form.setValue("category", category);
        toast({
          title: "Catégorie suggérée",
          description: `La catégorie "${category}" a été ajoutée. Vous pouvez la modifier.`,
        });
      } else {
        toast({
          title: "Aucune catégorie suggérée",
          description: "L'IA n'a pas pu suggérer de catégorie pour cette description.",
        });
      }
    } catch (error) {
      console.error("Erreur lors de la suggestion de catégorie:", error);
      toast({
        title: "Erreur de suggestion",
        description: "Impossible de suggérer une catégorie.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingCategory(false);
    }
  };


  if (authLoading || !currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.loader className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col">
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
          <Link href="/dashboard" className="text-xl font-bold text-sidebar-header-title-color flex items-center">
             <Icons.dollarSign className="mr-2 h-7 w-7"/>
            <span>SharePot</span>
          </Link>
        <div className="flex flex-1 items-center justify-end gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Icons.bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer">
                <AvatarImage
                  src={userProfile?.avatarUrl && userProfile.avatarUrl.trim() !== '' ? userProfile.avatarUrl : undefined}
                  alt={userProfile?.name || currentUser?.email || "User"}
                  data-ai-hint="user avatar"
                />
                <AvatarFallback>{getAvatarFallbackText(userProfile?.name, currentUser?.email)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userProfile?.name || currentUser?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <Icons.user className="mr-2 h-4 w-4" />
                  Mon Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <Icons.logOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 flex-grow">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Nouvelle Dépense</h1>
        <Link href="/expenses" passHref>
          <Button variant="outline">
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Retour aux dépenses
          </Button>
        </Link>
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Enregistrer une nouvelle dépense</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <Card className="bg-muted/30 p-4">
                <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-lg">Analyse de facture par IA (Optionnel)</CardTitle>
                    <CardDescription className="text-xs">
                        Chargez une image de votre facture pour pré-remplir certains champs.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <FormField
                        control={form.control}
                        name="invoiceForAnalysis"
                        render={({ field: { onChange, onBlur, name, ref } }) => {
                           // eslint-disable-next-line @typescript-eslint/no-unused-vars
                           const { value: _value, ...restOfField } = form.register(name);
                           return (
                            <FormItem>
                               <FormLabel>Fichier de facture pour analyse</FormLabel>
                                <FormControl>
                                <Input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    className="h-14 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                    data-ai-hint="invoice file upload for AI analysis"
                                    onBlur={onBlur}
                                    name={name}
                                    ref={ref}
                                    onChange={(e) => {
                                        const file = e.target.files ? e.target.files[0] : undefined;
                                        onChange(file); 
                                        setInvoiceFile(file || null); 
                                    }}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                           );
                        }}
                    />
                    <div className="mt-3 flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            onClick={handleAnalyzeUploadedFile}
                            disabled={!invoiceFile || isAnalyzing || isSubmitting || showCamera}
                            className="flex-1"
                            variant="outline"
                        >
                            {isAnalyzing && invoiceFile ? (
                                <>
                                <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                                Analyse en cours...
                                </>
                            ) : (
                                <>
                                <Icons.scan className="mr-2 h-4 w-4" />
                                Analyser la facture chargée
                                </>
                            )}
                        </Button>
                        {isMobile && (
                             <Button
                                type="button"
                                onClick={handleOpenCamera}
                                disabled={isAnalyzing || isSubmitting || showCamera}
                                className="flex-1"
                                variant="outline"
                            >
                                <Icons.camera className="mr-2 h-4 w-4" />
                                Scanner une facture (Caméra)
                            </Button>
                        )}
                    </div>
                     {showCamera && (
                        <div className="mt-4 space-y-3 p-4 border rounded-md bg-background">
                            <video ref={videoRef} className="w-full aspect-video rounded-md" autoPlay muted playsInline/>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                            {hasCameraPermission === false && (
                                 <Alert variant="destructive">
                                    <AlertTitle>Accès Caméra Requis</AlertTitle>
                                    <AlertDescription>
                                        Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur pour utiliser cette fonctionnalité.
                                    </AlertDescription>
                                </Alert>
                            )}
                           {hasCameraPermission && (
                               <div className="flex gap-2 items-center">
                                    <Button type="button" onClick={handleCaptureAndAnalyze} className="flex-grow" disabled={isAnalyzing}>
                                        {isAnalyzing ? <Icons.loader className="animate-spin mr-2"/> : <Icons.scan className="mr-2 h-4 w-4" />}
                                        Capturer et Analyser
                                    </Button>
                                    {availableCameras.length > 1 && (
                                      <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={handleSwitchCamera}
                                          disabled={isAnalyzing}
                                          aria-label="Changer de caméra"
                                      >
                                          <Icons.repeat className="h-5 w-5" />
                                      </Button>
                                    )}
                                    <Button type="button" variant="outline" onClick={handleCloseCamera} disabled={isAnalyzing} className="flex-shrink-0">
                                        <Icons.close className="mr-2 h-4 w-4" /> Annuler
                                    </Button>
                               </div>
                           )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Separator className="my-6" />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Dîner d'équipe" {...field} value={field.value || ''} data-ai-hint="expense description"/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          step="0.01"
                          data-ai-hint="expense amount"
                          value={field.value === undefined || field.value === null ? '' : Number(field.value)}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Devise</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-ai-hint="currency select">
                            <SelectValue placeholder="Choisir une devise" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map(currencyCode => (
                            <SelectItem key={currencyCode} value={currencyCode}>
                              {currencyCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet associé</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isLoadingProjects}
                    >
                      <FormControl>
                        <SelectTrigger data-ai-hint="project select">
                          <SelectValue placeholder={isLoadingProjects ? "Chargement des projets..." : "Sélectionner un projet"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                         {projects.length === 0 && !isLoadingProjects && (
                            <p className="p-2 text-sm text-muted-foreground">Aucun projet disponible. Créez-en un d'abord.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidById"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payé par</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        disabled={isLoadingUsersForDropdown || !watchedProjectId}
                    >
                      <FormControl>
                        <SelectTrigger data-ai-hint="user select paid by">
                          <SelectValue placeholder={
                            !watchedProjectId
                              ? "Sélectionnez d'abord un projet"
                              : isLoadingUsersForDropdown
                                ? "Chargement des membres..."
                                : usersForDropdown.length === 0
                                    ? "Aucun membre pour ce projet"
                                    : "Sélectionner un payeur"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usersForDropdown.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} {currentUser && user.id === currentUser.uid ? "(Moi)" : ""}
                          </SelectItem>
                        ))}
                         {usersForDropdown.length === 0 && watchedProjectId && !isLoadingUsersForDropdown && (
                            <p className="p-2 text-sm text-muted-foreground">Aucun membre pour ce projet ou chargement en cours.</p>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de la dépense</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            data-ai-hint="date picker trigger"
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: fr })
                            ) : (
                              <span>Choisir une date</span>
                            )}
                            <Icons.calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                          locale={fr}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Catégorie (optionnel)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSuggestCategory}
                        disabled={isSuggestingCategory || !watchedDescription || watchedDescription.trim().length < 3}
                      >
                        {isSuggestingCategory && <Icons.loader className="mr-2 h-4 w-4 animate-spin" />}
                        <Icons.sparkles className="mr-2 h-4 w-4" />
                        Suggérer (IA)
                      </Button>
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Ex: Nourriture, Transport..."
                        {...field}
                        value={field.value ?? ''}
                        data-ai-hint="expense category"
                      />
                    </FormControl>
                    <FormDescription>
                      Entrez une catégorie ou utilisez la suggestion IA basée sur la description.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting || isAnalyzing}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingProjects || isLoadingUsersForDropdown || isAnalyzing || isSuggestingCategory}>
                  {isSubmitting ? (
                    <>
                      <Icons.loader className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Icons.save className="mr-2 h-4 w-4" />
                      Enregistrer la dépense
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

