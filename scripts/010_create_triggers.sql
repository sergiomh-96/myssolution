-- Create triggers for automated functionality

-- Trigger to auto-create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Triggers to update updated_at timestamp
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_offers_updated_at ON public.offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_technical_requests_updated_at ON public.technical_requests;
CREATE TRIGGER update_technical_requests_updated_at
  BEFORE UPDATE ON public.technical_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON public.chat_channels;
CREATE TRIGGER update_chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger for offer approval notifications
DROP TRIGGER IF EXISTS on_offer_approved ON public.offers;
CREATE TRIGGER on_offer_approved
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_offer_approved();

-- Trigger for offer rejection notifications
DROP TRIGGER IF EXISTS on_offer_rejected ON public.offers;
CREATE TRIGGER on_offer_rejected
  AFTER UPDATE ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_offer_rejected();

-- Trigger for request assignment notifications
DROP TRIGGER IF EXISTS on_request_assigned ON public.technical_requests;
CREATE TRIGGER on_request_assigned
  AFTER UPDATE ON public.technical_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_request_assigned();

-- Trigger to auto-update resolved_at on request status change
DROP TRIGGER IF EXISTS on_request_status_change ON public.technical_requests;
CREATE TRIGGER on_request_status_change
  BEFORE UPDATE ON public.technical_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_request_resolved_at();

-- Activity logging triggers (optional - can be resource-intensive)
-- Uncomment if you want automatic activity logging

-- DROP TRIGGER IF EXISTS log_customer_activity ON public.customers;
-- CREATE TRIGGER log_customer_activity
--   AFTER INSERT OR UPDATE OR DELETE ON public.customers
--   FOR EACH ROW
--   EXECUTE FUNCTION public.log_activity();

-- DROP TRIGGER IF EXISTS log_offer_activity ON public.offers;
-- CREATE TRIGGER log_offer_activity
--   AFTER INSERT OR UPDATE OR DELETE ON public.offers
--   FOR EACH ROW
--   EXECUTE FUNCTION public.log_activity();

-- DROP TRIGGER IF EXISTS log_request_activity ON public.technical_requests;
-- CREATE TRIGGER log_request_activity
--   AFTER INSERT OR UPDATE OR DELETE ON public.technical_requests
--   FOR EACH ROW
--   EXECUTE FUNCTION public.log_activity();
