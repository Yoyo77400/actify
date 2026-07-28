-- listings.sales_count n'a jamais été incrémenté : la colonne vaut 0 partout,
-- ce qui rendait le tri `sort=sales` du catalogue inopérant. Le compteur est
-- désormais maintenu à la confirmation d'une commande (orders.service) ; cette
-- migration rattrape l'historique à partir de la source de vérité, les achats.
UPDATE "listings" l
SET "sales_count" = (
  SELECT COUNT(*)
  FROM "purchases" p
  WHERE p."listing_id" = l."id" AND p."status" = 'Confirmed'
);
